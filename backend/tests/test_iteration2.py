"""Iteration-2 backend tests: 5-min lock, /api/winners/latest, /api/admin/matches/{id}/predictions."""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "ncc-admin-2026"
RUN = uuid.uuid4().hex[:6]


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_headers():
    return {"X-Admin-Password": ADMIN_PASSWORD, "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def emp1(session):
    eid = f"TEST_I2_E1_{RUN}"
    session.post(f"{API}/auth/register", json={"employee_id": eid, "name": "Iter2 Emp1"})
    return eid


@pytest.fixture(scope="module")
def emp2(session):
    eid = f"TEST_I2_E2_{RUN}"
    session.post(f"{API}/auth/register", json={"employee_id": eid, "name": "Iter2 Emp2"})
    return eid


def _iso_in(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat().replace("+00:00", "Z")


def _create_match(session, admin_headers, minutes_from_now: int):
    r = session.post(
        f"{API}/admin/matches",
        headers=admin_headers,
        json={
            "team_a": f"TEST_A_{RUN}_{minutes_from_now}",
            "team_b": f"TEST_B_{RUN}_{minutes_from_now}",
            "team_a_ar": "أ",
            "team_b_ar": "ب",
            "flag_a": "🏳️",
            "flag_b": "🏳️",
            "group": "Z",
            "stage": "Group Stage",
            "kickoff": _iso_in(minutes_from_now),
        },
    )
    assert r.status_code == 200, r.text
    return r.json()


# ---------- 5-minute lock rule ----------
class TestFiveMinuteLock:
    def test_predict_locked_within_5min(self, session, admin_headers, emp1):
        """Match kicks off in 2 minutes => must be locked."""
        m = _create_match(session, admin_headers, 2)
        try:
            r = session.post(f"{API}/predictions", json={
                "employee_id": emp1, "match_id": m["id"],
                "winner": "team_a", "score_a": 1, "score_b": 0,
            })
            assert r.status_code == 400, r.text
            detail = r.json().get("detail", "").lower()
            assert "lock" in detail, f"Expected 'lock' in detail, got: {detail}"
        finally:
            session.delete(f"{API}/admin/matches/{m['id']}", headers=admin_headers)

    def test_predict_unlocked_outside_5min(self, session, admin_headers, emp1):
        """Match kicks off in 30 minutes => must accept the prediction."""
        m = _create_match(session, admin_headers, 30)
        try:
            r = session.post(f"{API}/predictions", json={
                "employee_id": emp1, "match_id": m["id"],
                "winner": "team_a", "score_a": 2, "score_b": 1,
            })
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["score_a"] == 2 and data["score_b"] == 1
            assert data["winner"] == "team_a"
        finally:
            session.delete(f"{API}/admin/matches/{m['id']}", headers=admin_headers)

    def test_predict_locked_exactly_at_5min(self, session, admin_headers, emp1):
        """Match kicks off in 5 minutes exactly => boundary, must be locked (>=)."""
        m = _create_match(session, admin_headers, 5)
        try:
            r = session.post(f"{API}/predictions", json={
                "employee_id": emp1, "match_id": m["id"],
                "winner": "team_a", "score_a": 1, "score_b": 0,
            })
            assert r.status_code == 400, r.text
        finally:
            session.delete(f"{API}/admin/matches/{m['id']}", headers=admin_headers)


# ---------- Admin predictions enriched ----------
class TestAdminMatchPredictions:
    def test_returns_employee_name_id_and_timestamp(self, session, admin_headers, emp1, emp2):
        m = _create_match(session, admin_headers, 60)
        try:
            # both employees submit
            r1 = session.post(f"{API}/predictions", json={
                "employee_id": emp1, "match_id": m["id"],
                "winner": "team_a", "score_a": 3, "score_b": 1,
            })
            assert r1.status_code == 200, r1.text
            r2 = session.post(f"{API}/predictions", json={
                "employee_id": emp2, "match_id": m["id"],
                "winner": "team_b", "score_a": 0, "score_b": 2,
            })
            assert r2.status_code == 200, r2.text

            # unauthorized
            r_un = session.get(f"{API}/admin/matches/{m['id']}/predictions")
            assert r_un.status_code == 401

            # authorized
            r = session.get(f"{API}/admin/matches/{m['id']}/predictions", headers=admin_headers)
            assert r.status_code == 200, r.text
            body = r.json()
            assert "predictions" in body and "count" in body
            assert body["count"] == 2
            eid_to_pred = {p["employee_id"]: p for p in body["predictions"]}
            assert emp1 in eid_to_pred and emp2 in eid_to_pred
            for eid in (emp1, emp2):
                p = eid_to_pred[eid]
                assert "employee_name" in p and p["employee_name"]
                assert "created_at" in p and "T" in p["created_at"], "created_at must be ISO"
                # parse-able ISO
                datetime.fromisoformat(p["created_at"].replace("Z", "+00:00"))
                assert "_id" not in p
        finally:
            session.delete(f"{API}/admin/matches/{m['id']}", headers=admin_headers)


# ---------- /api/winners/latest ----------
class TestWinnersLatest:
    def test_winners_after_result(self, session, admin_headers, emp1, emp2):
        m = _create_match(session, admin_headers, 60)
        try:
            # emp1: exact 2-1 (winner team_a)
            session.post(f"{API}/predictions", json={
                "employee_id": emp1, "match_id": m["id"],
                "winner": "team_a", "score_a": 2, "score_b": 1,
            })
            # emp2: correct winner only 3-0 -> still team_a wins
            session.post(f"{API}/predictions", json={
                "employee_id": emp2, "match_id": m["id"],
                "winner": "team_a", "score_a": 3, "score_b": 0,
            })

            # Submit result 2-1 -> emp1 exact (5), emp2 winner only (3)
            r = session.post(
                f"{API}/admin/matches/{m['id']}/result",
                headers=admin_headers,
                json={"result_a": 2, "result_b": 1},
            )
            assert r.status_code == 200

            r2 = session.get(f"{API}/winners/latest")
            assert r2.status_code == 200, r2.text
            body = r2.json()
            assert body["match"] is not None
            # The endpoint returns most recently FINISHED match by kickoff desc; our
            # new match has kickoff in the future so it has the latest kickoff value
            # and should be the one returned.
            assert body["match"]["id"] == m["id"]
            winners = {w["employee_id"]: w for w in body["winners"]}
            assert emp1 in winners and emp2 in winners
            assert winners[emp1]["points"] == 5 and winners[emp1]["exact"] is True
            assert winners[emp2]["points"] == 3 and winners[emp2]["exact"] is False
            assert winners[emp1]["name"] and winners[emp2]["name"]
            # winners sorted by points desc
            pts_seq = [w["points"] for w in body["winners"]]
            assert pts_seq == sorted(pts_seq, reverse=True)
        finally:
            session.delete(f"{API}/admin/matches/{m['id']}", headers=admin_headers)

    def test_winners_latest_structure_when_present(self, session):
        r = session.get(f"{API}/winners/latest")
        assert r.status_code == 200
        body = r.json()
        assert "match" in body and "winners" in body
        assert isinstance(body["winners"], list)
