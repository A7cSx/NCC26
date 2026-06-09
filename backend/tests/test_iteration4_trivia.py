"""
Iteration-4 trivia tests: user-facing + admin CRUD for trivia game.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://world-cup-contest.preview.emergentagent.com").rstrip("/")
ADMIN_USER = "Rashed550011"
ADMIN_PASS = "Rr@123123"


# ----- Fixtures -----
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def user_session():
    suffix = uuid.uuid4().hex[:8]
    username = f"trv_{suffix}"
    payload = {
        "full_name": f"TEST Trivia User {suffix}",
        "username": username,
        "employee_id": f"TEST_TRV_{suffix}",
        "password": "pass1234",
        "confirm_password": "pass1234",
    }
    r = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "username": username}


@pytest.fixture(scope="module")
def user_headers(user_session):
    return {"Authorization": f"Bearer {user_session['token']}"}


# ----- Admin trivia CRUD -----
class TestAdminTriviaCRUD:
    def test_admin_list_questions_seeded(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/trivia/questions", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "questions" in data
        assert data["total"] >= 82, f"Expected at least 82 seeded questions, got {data['total']}"
        assert data["active"] >= 1
        # Validate question shape
        q = data["questions"][0]
        for k in ("id", "question", "question_ar", "choices", "choices_ar", "correct_index", "active"):
            assert k in q

    def test_admin_stats(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/trivia/stats", headers=admin_headers)
        assert r.status_code == 200
        s = r.json()
        assert s["questions"]["total"] >= 82
        assert "by_type" in s and "by_difficulty" in s and "by_category" in s

    def test_admin_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/trivia/questions")
        assert r.status_code in (401, 403)

    def test_admin_create_update_toggle_delete(self, admin_headers):
        payload = {
            "question": "TEST_Q What country won WC 2022?",
            "question_ar": "اختبار: من فاز بكأس العالم 2022؟",
            "type": "text",
            "choices": ["Argentina", "France", "Brazil", "Germany"],
            "choices_ar": ["الأرجنتين", "فرنسا", "البرازيل", "ألمانيا"],
            "correct_index": 0,
            "difficulty": "medium",
            "category": "tournaments",
            "explanation": "Argentina won on penalties.",
            "explanation_ar": "فازت الأرجنتين بركلات الترجيح.",
            "active": True,
        }
        r = requests.post(f"{BASE_URL}/api/admin/trivia/questions", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        created = r.json()
        qid = created["id"]
        assert created["question"] == payload["question"]
        assert created["correct_index"] == 0

        # Verify it shows in list
        r = requests.get(f"{BASE_URL}/api/admin/trivia/questions", headers=admin_headers,
                         params={"q": "TEST_Q"})
        assert r.status_code == 200
        ids = [q["id"] for q in r.json()["questions"]]
        assert qid in ids

        # Update
        upd = dict(payload)
        upd["question"] = "TEST_Q (updated)"
        upd["correct_index"] = 1
        r = requests.put(f"{BASE_URL}/api/admin/trivia/questions/{qid}", json=upd, headers=admin_headers)
        assert r.status_code == 200
        # Verify update
        r = requests.get(f"{BASE_URL}/api/admin/trivia/questions", headers=admin_headers, params={"q": "TEST_Q"})
        match = [q for q in r.json()["questions"] if q["id"] == qid]
        assert match and match[0]["question"] == "TEST_Q (updated)"
        assert match[0]["correct_index"] == 1

        # Toggle
        r = requests.post(f"{BASE_URL}/api/admin/trivia/questions/{qid}/toggle", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["active"] is False
        r = requests.post(f"{BASE_URL}/api/admin/trivia/questions/{qid}/toggle", headers=admin_headers)
        assert r.json()["active"] is True

        # Delete
        r = requests.delete(f"{BASE_URL}/api/admin/trivia/questions/{qid}", headers=admin_headers)
        assert r.status_code == 200
        # 404 on second delete
        r = requests.delete(f"{BASE_URL}/api/admin/trivia/questions/{qid}", headers=admin_headers)
        assert r.status_code == 404

    def test_admin_validates_choices_count(self, admin_headers):
        bad = {
            "question": "TEST_Q bad",
            "question_ar": "اختبار",
            "type": "text",
            "choices": ["A", "B", "C"],  # only 3
            "choices_ar": ["A", "B", "C"],
            "correct_index": 0,
        }
        r = requests.post(f"{BASE_URL}/api/admin/trivia/questions", json=bad, headers=admin_headers)
        assert r.status_code == 400


# ----- User-facing trivia -----
class TestTriviaPlay:
    def test_start_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/trivia/start")
        assert r.status_code in (401, 403)

    def test_start_session_returns_10_questions(self, user_headers):
        r = requests.post(f"{BASE_URL}/api/trivia/start", headers=user_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["time_per_question_seconds"] == 40
        assert data["total_questions"] == 10
        assert len(data["questions"]) == 10
        # Public payload must not leak correct_index/explanation
        q0 = data["questions"][0]
        assert "correct_index" not in q0
        assert "explanation" not in q0
        assert "explanation_ar" not in q0
        assert len(q0["choices"]) == 4
        assert len(q0["choices_ar"]) == 4

    def test_full_session_flow_with_scoring(self, admin_headers, user_headers):
        # Start
        r = requests.post(f"{BASE_URL}/api/trivia/start", headers=user_headers)
        assert r.status_code == 200
        sess = r.json()
        session_id = sess["session_id"]
        questions = sess["questions"]

        # Get correct answers from admin endpoint
        admin_q_resp = requests.get(f"{BASE_URL}/api/admin/trivia/questions",
                                     headers=admin_headers).json()["questions"]
        correct_by_id = {q["id"]: q["correct_index"] for q in admin_q_resp}

        total_correct_expected = 0
        total_score_expected = 0
        for i, q in enumerate(questions):
            qid = q["id"]
            correct_idx = correct_by_id[qid]
            # Make first 5 correct quickly (under 10s -> bonus), last 5 wrong
            if i < 5:
                chosen = correct_idx
                time_ms = 3000
                total_correct_expected += 1
                total_score_expected += 15
            else:
                chosen = (correct_idx + 1) % 4
                time_ms = 12000
            r = requests.post(f"{BASE_URL}/api/trivia/answer",
                              headers=user_headers,
                              json={
                                  "session_id": session_id,
                                  "question_id": qid,
                                  "chosen_index": chosen,
                                  "time_taken_ms": time_ms,
                              })
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["correct"] is (chosen == correct_idx)
            if chosen == correct_idx:
                assert data["points_earned"] == 15  # 10 + 5 fast bonus
            else:
                assert data["points_earned"] == 0
            if i == len(questions) - 1:
                assert data["session_finished"] is True
            else:
                assert data["session_finished"] is False

        assert data["session_score"] == total_score_expected
        assert data["session_correct"] == total_correct_expected

        # ALREADY_ANSWERED check
        first_q = questions[0]
        r = requests.post(f"{BASE_URL}/api/trivia/answer", headers=user_headers, json={
            "session_id": session_id,
            "question_id": first_q["id"],
            "chosen_index": 0,
            "time_taken_ms": 1000,
        })
        # Either already-answered OR session-finished — both are valid 400
        assert r.status_code == 400

    def test_timeout_answer_with_minus_one(self, admin_headers, user_headers):
        # Start a fresh session
        r = requests.post(f"{BASE_URL}/api/trivia/start", headers=user_headers)
        assert r.status_code == 200
        sess = r.json()
        first_q = sess["questions"][0]
        r = requests.post(f"{BASE_URL}/api/trivia/answer", headers=user_headers, json={
            "session_id": sess["session_id"],
            "question_id": first_q["id"],
            "chosen_index": -1,
            "time_taken_ms": 40000,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["correct"] is False
        assert d["points_earned"] == 0

    def test_my_stats_after_play(self, user_headers):
        r = requests.get(f"{BASE_URL}/api/trivia/my-stats", headers=user_headers)
        assert r.status_code == 200
        s = r.json()
        # We finished one session in test_full_session_flow_with_scoring
        assert s["sessions_count"] >= 1
        assert s["best_score"] >= 75  # 5 correct x 15
        assert s["total_points"] >= 75
        for key in ("total_points", "best_score", "sessions_count", "total_correct", "recent_sessions"):
            assert key in s

    def test_leaderboard_includes_user(self, user_headers, user_session):
        r = requests.get(f"{BASE_URL}/api/trivia/leaderboard")
        assert r.status_code == 200
        data = r.json()
        assert "entries" in data
        emp_ids = [e["employee_id"] for e in data["entries"]]
        assert user_session["user"]["employee_id"] in emp_ids

    def test_invalid_session_404(self, user_headers):
        r = requests.post(f"{BASE_URL}/api/trivia/answer", headers=user_headers, json={
            "session_id": "non-existent",
            "question_id": "non-existent",
            "chosen_index": 0,
            "time_taken_ms": 1000,
        })
        assert r.status_code == 404
