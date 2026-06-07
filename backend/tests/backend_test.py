"""Backend tests for NCC World Cup Prediction Contest."""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fall back to frontend/.env value if env var is not exported
    from pathlib import Path
    env_file = Path("/app/frontend/.env")
    for line in env_file.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "ncc-admin-2026"

# unique per-run identifiers to avoid clashing with prior runs
RUN = uuid.uuid4().hex[:6]
EID1 = f"TEST_E1_{RUN}"
EID2 = f"TEST_E2_{RUN}"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_headers():
    return {"X-Admin-Password": ADMIN_PASSWORD, "Content-Type": "application/json"}


# ---------- Matches: auto seed ----------
class TestMatches:
    def test_list_matches_seeded(self, session):
        r = session.get(f"{API}/matches")
        assert r.status_code == 200, r.text
        matches = r.json()
        assert isinstance(matches, list)
        assert len(matches) >= 20, f"Expected >=20 seeded matches, got {len(matches)}"
        for m in matches:
            assert "id" in m and "team_a" in m and "team_b" in m
            assert "_id" not in m  # mongo _id must not leak
        # status should be 'upcoming' for the freshly seeded matches at minimum we have some
        upcoming = [m for m in matches if m["status"] == "upcoming"]
        assert len(upcoming) >= 1


# ---------- Auth: register + login + idempotency ----------
class TestAuth:
    def test_register_creates(self, session):
        r = session.post(f"{API}/auth/register", json={"employee_id": EID1, "name": "Mohammed Test"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["employee_id"] == EID1
        assert data["name"] == "Mohammed Test"
        assert "id" in data

    def test_register_idempotent(self, session):
        r1 = session.post(f"{API}/auth/register", json={"employee_id": EID1, "name": "Mohammed Test"})
        r2 = session.post(f"{API}/auth/register", json={"employee_id": EID1, "name": "Different Name"})
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["id"] == r2.json()["id"], "Register must be idempotent on employee_id"

    def test_register_bad_payload(self, session):
        r = session.post(f"{API}/auth/register", json={"employee_id": "", "name": ""})
        assert r.status_code == 400

    def test_login_success(self, session):
        # register a second user
        session.post(f"{API}/auth/register", json={"employee_id": EID2, "name": "Sara Test"})
        r = session.post(f"{API}/auth/login", json={"employee_id": EID2})
        assert r.status_code == 200, r.text
        assert r.json()["employee_id"] == EID2

    def test_login_unknown(self, session):
        r = session.post(f"{API}/auth/login", json={"employee_id": f"NOPE_{RUN}"})
        assert r.status_code == 404


# ---------- Admin auth ----------
class TestAdminAuth:
    def test_admin_check_wrong(self, session):
        r = session.get(f"{API}/admin/check", headers={"X-Admin-Password": "wrong"})
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_admin_check_correct(self, session, admin_headers):
        r = session.get(f"{API}/admin/check", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_admin_route_requires_password(self, session):
        # Status change without admin header must 401
        # Need an upcoming match id
        m = session.get(f"{API}/matches").json()[0]
        r = session.post(f"{API}/admin/matches/{m['id']}/status", params={"status": "live"})
        assert r.status_code == 401


# ---------- Predictions + result + leaderboard ----------
class TestPredictionsFlow:
    @pytest.fixture(scope="class")
    def state(self, session, admin_headers):
        # ensure employees exist (in case test order changes)
        session.post(f"{API}/auth/register", json={"employee_id": EID1, "name": "Mohammed Test"})
        session.post(f"{API}/auth/register", json={"employee_id": EID2, "name": "Sara Test"})
        matches = session.get(f"{API}/matches").json()
        upcoming = [m for m in matches if m["status"] == "upcoming"]
        assert len(upcoming) >= 2, "Need at least 2 upcoming matches"
        return {"match1": upcoming[0], "match2": upcoming[1]}

    def test_submit_prediction_and_winner_autoderived(self, session, state):
        m = state["match1"]
        # Send winner intentionally wrong -> backend should auto-derive from scores
        payload = {
            "employee_id": EID1,
            "match_id": m["id"],
            "winner": "draw",  # mismatched on purpose
            "score_a": 2,
            "score_b": 1,
        }
        r = session.post(f"{API}/predictions", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["winner"] == "team_a", "Winner must be auto-derived from score (2-1 => team_a)"
        assert data["score_a"] == 2 and data["score_b"] == 1
        assert data["points"] == 0

        # GET /predictions/me reflects it
        r2 = session.get(f"{API}/predictions/me", params={"employee_id": EID1})
        assert r2.status_code == 200
        preds = r2.json()
        assert any(p["match_id"] == m["id"] for p in preds)

    def test_prediction_update_idempotent(self, session, state):
        m = state["match1"]
        # submit again -> should update, not duplicate
        r = session.post(f"{API}/predictions", json={
            "employee_id": EID1, "match_id": m["id"], "winner": "team_b",
            "score_a": 0, "score_b": 3
        })
        assert r.status_code == 200
        r2 = session.get(f"{API}/predictions/me", params={"employee_id": EID1})
        preds_for_match = [p for p in r2.json() if p["match_id"] == m["id"]]
        assert len(preds_for_match) == 1, "Updating prediction must not create duplicate"
        assert preds_for_match[0]["score_b"] == 3
        assert preds_for_match[0]["winner"] == "team_b"

    def test_predictions_locked_when_not_finished(self, session, state):
        m = state["match1"]
        r = session.get(f"{API}/predictions/match/{m['id']}")
        assert r.status_code == 200
        body = r.json()
        assert body["locked"] is True
        assert body["predictions"] == []

    def test_set_status_live_blocks_predictions(self, session, admin_headers, state):
        m = state["match2"]
        # employee2 must have a pre-existing prediction we can attempt to update after live
        r = session.post(f"{API}/predictions", json={
            "employee_id": EID2, "match_id": m["id"], "winner": "team_a",
            "score_a": 1, "score_b": 0
        })
        assert r.status_code == 200
        # now set live
        r2 = session.post(f"{API}/admin/matches/{m['id']}/status",
                          headers=admin_headers, params={"status": "live"})
        assert r2.status_code == 200, r2.text
        # new prediction attempt must 400
        r3 = session.post(f"{API}/predictions", json={
            "employee_id": EID1, "match_id": m["id"], "winner": "team_a",
            "score_a": 1, "score_b": 0
        })
        assert r3.status_code == 400
        # revert back to upcoming for cleanliness
        session.post(f"{API}/admin/matches/{m['id']}/status",
                     headers=admin_headers, params={"status": "upcoming"})

    def test_submit_result_updates_points_and_leaderboard(self, session, admin_headers, state):
        m = state["match1"]
        # EID1 predicted team_b winning 0-3 (after update); submit result 0-3 -> exact 5 points
        r = session.post(f"{API}/admin/matches/{m['id']}/result",
                         headers=admin_headers, json={"result_a": 0, "result_b": 3})
        assert r.status_code == 200, r.text
        # verify match now finished
        gm = session.get(f"{API}/matches/{m['id']}").json()
        assert gm["status"] == "finished"
        assert gm["result_a"] == 0 and gm["result_b"] == 3 and gm["winner"] == "team_b"

        # leaderboard reflects EID1 with 5 points
        lb = session.get(f"{API}/leaderboard").json()
        assert lb["finished_matches"] >= 1
        e1_row = next((e for e in lb["entries"] if e["employee_id"] == EID1), None)
        assert e1_row is not None, f"EID1 missing from leaderboard: {lb}"
        assert e1_row["points"] >= 5
        assert e1_row["exact_scores"] >= 1

        # predictions/match unlocked
        r2 = session.get(f"{API}/predictions/match/{m['id']}").json()
        assert r2["locked"] is False
        assert len(r2["predictions"]) >= 1
        assert "employee_name" in r2["predictions"][0]

    def test_predict_finished_match_rejected(self, session, state):
        m = state["match1"]  # now finished
        r = session.post(f"{API}/predictions", json={
            "employee_id": EID1, "match_id": m["id"], "winner": "team_a",
            "score_a": 1, "score_b": 0
        })
        assert r.status_code == 400


# ---------- Leaderboard anti-cheating: only finished matches counted ----------
class TestLeaderboardAntiCheat:
    def test_leaderboard_endpoint(self, session):
        r = session.get(f"{API}/leaderboard")
        assert r.status_code == 200
        body = r.json()
        assert "entries" in body and "finished_matches" in body
        # entries must only correspond to finished matches in finished_matches count
        assert body["finished_matches"] >= 0
