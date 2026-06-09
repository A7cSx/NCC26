"""
Trivia game module for the NCC World Cup Contest.
- 10 questions per session, 40-second timer per question.
- Separate leaderboard from the prediction contest.
- Templates: text, image_face (face-hidden / pixelated), image_jersey, image_trophy, composition.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid
import random

router = APIRouter()

DIFFICULTIES = ("medium", "hard")
TYPES = ("text", "image_face", "image_jersey", "image_trophy", "composition")
QUESTIONS_PER_SESSION = 10
TIME_PER_QUESTION_SECONDS = 40
POINTS_CORRECT = 10
POINTS_BONUS_FAST = 5  # bonus if answered in under 10 seconds


# ----------------- Pydantic models -----------------
class TriviaQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    question_ar: str
    type: str = "text"  # text | image_face | image_jersey | image_trophy | composition
    image_url: Optional[str] = None
    # For "composition" type: array of small image urls (e.g., 4 mini scenes for a player's life)
    composition_images: Optional[List[str]] = None
    choices: List[str]
    choices_ar: List[str]
    correct_index: int  # 0..3
    difficulty: str = "medium"  # medium | hard
    category: str = "general"  # players | matches | records | tournaments | general
    explanation: Optional[str] = None
    explanation_ar: Optional[str] = None
    active: bool = True
    source: str = "manual"  # manual | llm | upload
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TriviaQuestionPayload(BaseModel):
    question: str
    question_ar: str
    type: str = "text"
    image_url: Optional[str] = None
    composition_images: Optional[List[str]] = None
    choices: List[str]
    choices_ar: List[str]
    correct_index: int
    difficulty: str = "medium"
    category: str = "general"
    explanation: Optional[str] = None
    explanation_ar: Optional[str] = None
    active: bool = True


class TriviaAnswerSubmit(BaseModel):
    session_id: str
    question_id: str
    chosen_index: int  # -1 if timeout
    time_taken_ms: int  # how long the user took


def _to_public(q: dict) -> dict:
    """Strip the correct answer & explanation when sending to a player."""
    out = {k: v for k, v in q.items() if k not in ("_id",)}
    out.pop("correct_index", None)
    out.pop("explanation", None)
    out.pop("explanation_ar", None)
    return out


# ----------------- Routes (require user auth via Authorization Bearer) -----------------
def make_routes(db, verify_admin, get_current_user):
    """Factory that builds the trivia routes with access to shared deps."""

    # ---------- Player-facing ----------
    @router.post("/trivia/start")
    async def start_session(current=Depends(get_current_user)):
        # Find question IDs already answered correctly (to bias variety)
        attempted_ids = [a["question_id"] async for a in db.trivia_attempts.find(
            {"employee_id": current["employee_id"]}, {"question_id": 1, "_id": 0}
        )]
        # Prefer unattempted questions; fall back to any active questions if not enough
        pipeline_unattempted = [
            {"$match": {"active": True, "id": {"$nin": attempted_ids}}},
            {"$sample": {"size": QUESTIONS_PER_SESSION}},
        ]
        questions = await db.trivia_questions.aggregate(pipeline_unattempted).to_list(QUESTIONS_PER_SESSION)
        if len(questions) < QUESTIONS_PER_SESSION:
            need = QUESTIONS_PER_SESSION - len(questions)
            existing_ids = {q["id"] for q in questions}
            extra = await db.trivia_questions.aggregate([
                {"$match": {"active": True, "id": {"$nin": list(existing_ids)}}},
                {"$sample": {"size": need}},
            ]).to_list(need)
            questions.extend(extra)
        if not questions:
            raise HTTPException(404, "NO_QUESTIONS_AVAILABLE")

        session_id = str(uuid.uuid4())
        session_doc = {
            "id": session_id,
            "employee_id": current["employee_id"],
            "question_ids": [q["id"] for q in questions],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": None,
            "score": 0,
            "correct_count": 0,
            "total_answered": 0,
            "answers": [],  # list of {question_id, chosen_index, correct, time_taken_ms, points}
        }
        await db.trivia_sessions.insert_one(session_doc)
        return {
            "session_id": session_id,
            "time_per_question_seconds": TIME_PER_QUESTION_SECONDS,
            "total_questions": len(questions),
            "questions": [_to_public(q) for q in questions],
        }

    @router.post("/trivia/answer")
    async def submit_answer(payload: TriviaAnswerSubmit, current=Depends(get_current_user)):
        session = await db.trivia_sessions.find_one({"id": payload.session_id})
        if not session or session["employee_id"] != current["employee_id"]:
            raise HTTPException(404, "SESSION_NOT_FOUND")
        if session.get("finished_at"):
            raise HTTPException(400, "SESSION_FINISHED")
        if payload.question_id not in session["question_ids"]:
            raise HTTPException(400, "INVALID_QUESTION")
        if any(a["question_id"] == payload.question_id for a in session.get("answers", [])):
            raise HTTPException(400, "ALREADY_ANSWERED")

        q = await db.trivia_questions.find_one({"id": payload.question_id})
        if not q:
            raise HTTPException(404, "QUESTION_NOT_FOUND")

        correct = (payload.chosen_index == q["correct_index"])
        # Scoring: 10 pts if correct, +5 bonus if under 10s
        points = 0
        if correct:
            points = POINTS_CORRECT
            if payload.time_taken_ms < 10000:
                points += POINTS_BONUS_FAST

        answer_entry = {
            "question_id": payload.question_id,
            "chosen_index": payload.chosen_index,
            "correct_index": q["correct_index"],
            "correct": correct,
            "time_taken_ms": int(payload.time_taken_ms),
            "points": points,
            "answered_at": datetime.now(timezone.utc).isoformat(),
        }
        new_total_answered = session.get("total_answered", 0) + 1
        new_score = session.get("score", 0) + points
        new_correct = session.get("correct_count", 0) + (1 if correct else 0)
        finished = new_total_answered >= len(session["question_ids"])

        update = {
            "$push": {"answers": answer_entry},
            "$set": {
                "score": new_score,
                "correct_count": new_correct,
                "total_answered": new_total_answered,
            },
        }
        if finished:
            update["$set"]["finished_at"] = datetime.now(timezone.utc).isoformat()
        await db.trivia_sessions.update_one({"id": payload.session_id}, update)

        # Track attempt per-question for "no repeat" preference
        await db.trivia_attempts.update_one(
            {"employee_id": current["employee_id"], "question_id": payload.question_id},
            {"$set": {
                "employee_id": current["employee_id"],
                "question_id": payload.question_id,
                "last_answered_at": datetime.now(timezone.utc).isoformat(),
                "correct": correct,
            }},
            upsert=True,
        )

        return {
            "correct": correct,
            "correct_index": q["correct_index"],
            "explanation": q.get("explanation"),
            "explanation_ar": q.get("explanation_ar"),
            "points_earned": points,
            "session_score": new_score,
            "session_correct": new_correct,
            "session_finished": finished,
        }

    @router.get("/trivia/leaderboard")
    async def trivia_leaderboard():
        # Aggregate total trivia points per employee (sum of all finished sessions)
        pipeline = [
            {"$group": {
                "_id": "$employee_id",
                "total_points": {"$sum": "$score"},
                "sessions_count": {"$sum": 1},
                "best_score": {"$max": "$score"},
                "total_correct": {"$sum": "$correct_count"},
                "last_played_at": {"$max": "$started_at"},
            }},
            {"$sort": {"total_points": -1, "best_score": -1}},
            {"$limit": 100},
        ]
        rows = await db.trivia_sessions.aggregate(pipeline).to_list(100)
        emp_ids = [r["_id"] for r in rows]
        emps = {e["employee_id"]: e async for e in db.employees.find({"employee_id": {"$in": emp_ids}}, {"_id": 0, "password_hash": 0})}
        entries = []
        for i, r in enumerate(rows):
            e = emps.get(r["_id"])
            entries.append({
                "rank": i + 1,
                "employee_id": r["_id"],
                "full_name": (e or {}).get("full_name") or (e or {}).get("name") or "?",
                "username": (e or {}).get("username") or "",
                "total_points": r["total_points"],
                "sessions_count": r["sessions_count"],
                "best_score": r["best_score"],
                "total_correct": r["total_correct"],
                "last_played_at": r["last_played_at"],
            })
        return {"count": len(entries), "entries": entries}

    @router.get("/trivia/my-stats")
    async def trivia_my_stats(current=Depends(get_current_user)):
        sessions = await db.trivia_sessions.find(
            {"employee_id": current["employee_id"], "finished_at": {"$ne": None}},
            {"_id": 0}
        ).sort("started_at", -1).to_list(50)
        total_points = sum(s.get("score", 0) for s in sessions)
        best_score = max((s.get("score", 0) for s in sessions), default=0)
        total_correct = sum(s.get("correct_count", 0) for s in sessions)
        return {
            "total_points": total_points,
            "best_score": best_score,
            "sessions_count": len(sessions),
            "total_correct": total_correct,
            "recent_sessions": sessions[:10],
        }

    # ---------- Admin: questions CRUD ----------
    @router.get("/admin/trivia/questions", dependencies=[Depends(verify_admin)])
    async def admin_list_questions(
        q: Optional[str] = None,
        difficulty: Optional[str] = None,
        category: Optional[str] = None,
        type: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 1000,
    ):
        query = {}
        if difficulty: query["difficulty"] = difficulty
        if category: query["category"] = category
        if type: query["type"] = type
        if active is not None: query["active"] = active
        if q:
            import re as _re
            regex = {"$regex": _re.escape(q), "$options": "i"}
            query["$or"] = [{"question": regex}, {"question_ar": regex}, {"category": regex}]
        items = await db.trivia_questions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        total = await db.trivia_questions.count_documents({})
        active_count = await db.trivia_questions.count_documents({"active": True})
        return {"count": len(items), "total": total, "active": active_count, "questions": items}

    @router.post("/admin/trivia/questions", dependencies=[Depends(verify_admin)])
    async def admin_create_question(payload: TriviaQuestionPayload):
        if len(payload.choices) != 4 or len(payload.choices_ar) != 4:
            raise HTTPException(400, "MUST_BE_4_CHOICES")
        if not (0 <= payload.correct_index <= 3):
            raise HTTPException(400, "INVALID_CORRECT_INDEX")
        if payload.type not in TYPES:
            raise HTTPException(400, "INVALID_TYPE")
        if payload.difficulty not in DIFFICULTIES:
            raise HTTPException(400, "INVALID_DIFFICULTY")
        q = TriviaQuestion(**payload.model_dump())
        await db.trivia_questions.insert_one(q.model_dump())
        return q.model_dump()

    @router.put("/admin/trivia/questions/{question_id}", dependencies=[Depends(verify_admin)])
    async def admin_update_question(question_id: str, payload: TriviaQuestionPayload):
        if len(payload.choices) != 4 or len(payload.choices_ar) != 4:
            raise HTTPException(400, "MUST_BE_4_CHOICES")
        res = await db.trivia_questions.update_one(
            {"id": question_id},
            {"$set": payload.model_dump()}
        )
        if res.matched_count == 0:
            raise HTTPException(404, "QUESTION_NOT_FOUND")
        return {"ok": True}

    @router.delete("/admin/trivia/questions/{question_id}", dependencies=[Depends(verify_admin)])
    async def admin_delete_question(question_id: str):
        res = await db.trivia_questions.delete_one({"id": question_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "QUESTION_NOT_FOUND")
        return {"ok": True}

    @router.post("/admin/trivia/questions/{question_id}/toggle", dependencies=[Depends(verify_admin)])
    async def admin_toggle_active(question_id: str):
        q = await db.trivia_questions.find_one({"id": question_id})
        if not q:
            raise HTTPException(404, "QUESTION_NOT_FOUND")
        await db.trivia_questions.update_one({"id": question_id}, {"$set": {"active": not q.get("active", True)}})
        return {"ok": True, "active": not q.get("active", True)}

    @router.get("/admin/trivia/stats", dependencies=[Depends(verify_admin)])
    async def admin_trivia_stats():
        total_q = await db.trivia_questions.count_documents({})
        active_q = await db.trivia_questions.count_documents({"active": True})
        sessions_total = await db.trivia_sessions.count_documents({})
        sessions_finished = await db.trivia_sessions.count_documents({"finished_at": {"$ne": None}})
        attempts = await db.trivia_attempts.count_documents({})
        by_type = await db.trivia_questions.aggregate([
            {"$group": {"_id": "$type", "n": {"$sum": 1}}}
        ]).to_list(20)
        by_diff = await db.trivia_questions.aggregate([
            {"$group": {"_id": "$difficulty", "n": {"$sum": 1}}}
        ]).to_list(20)
        by_cat = await db.trivia_questions.aggregate([
            {"$group": {"_id": "$category", "n": {"$sum": 1}}}
        ]).to_list(30)
        return {
            "questions": {"total": total_q, "active": active_q},
            "sessions": {"total": sessions_total, "finished": sessions_finished},
            "attempts": attempts,
            "by_type": by_type,
            "by_difficulty": by_diff,
            "by_category": by_cat,
        }

    @router.post("/admin/trivia/seed", dependencies=[Depends(verify_admin)])
    async def admin_seed(force: bool = False):
        from trivia_seed import SEED_QUESTIONS
        if not force:
            existing = await db.trivia_questions.count_documents({})
            if existing > 0:
                return {"ok": False, "message": "Already seeded", "existing": existing}
        else:
            await db.trivia_questions.delete_many({})
        docs = []
        for spec in SEED_QUESTIONS:
            q = TriviaQuestion(**spec)
            docs.append(q.model_dump())
        if docs:
            await db.trivia_questions.insert_many(docs)
        return {"ok": True, "inserted": len(docs)}

    return router
