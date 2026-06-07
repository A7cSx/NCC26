from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'ncc-admin-2026')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EmployeeCreate(BaseModel):
    employee_id: str
    name: str


class EmployeeLogin(BaseModel):
    employee_id: str


class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_a: str
    team_b: str
    team_a_ar: str
    team_b_ar: str
    flag_a: str = ""
    flag_b: str = ""
    group: str = ""
    stage: str = "Group Stage"
    kickoff: str  # ISO datetime
    status: str = "upcoming"  # upcoming | live | finished
    result_a: Optional[int] = None
    result_b: Optional[int] = None
    winner: Optional[str] = None  # team_a | team_b | draw


class MatchCreate(BaseModel):
    team_a: str
    team_b: str
    team_a_ar: str = ""
    team_b_ar: str = ""
    flag_a: str = ""
    flag_b: str = ""
    group: str = ""
    stage: str = "Group Stage"
    kickoff: str


class MatchResult(BaseModel):
    result_a: int
    result_b: int


class Prediction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    match_id: str
    winner: str  # team_a | team_b | draw
    score_a: int
    score_b: int
    points: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PredictionCreate(BaseModel):
    employee_id: str
    match_id: str
    winner: str
    score_a: int
    score_b: int


# ---------- Helpers ----------
def clean(doc):
    if doc is None:
        return None
    doc.pop('_id', None)
    return doc


def verify_admin(x_admin_password: str = Header(None)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


def compute_points(p_winner: str, p_a: int, p_b: int, r_winner: str, r_a: int, r_b: int) -> int:
    if p_a == r_a and p_b == r_b:
        return 5  # exact score
    if p_winner == r_winner:
        return 3  # correct winner
    return 0


def determine_winner(a: int, b: int) -> str:
    if a > b:
        return "team_a"
    if b > a:
        return "team_b"
    return "draw"


# ---------- Auth / Employees ----------
@api_router.post("/auth/register")
async def register(payload: EmployeeCreate):
    eid = payload.employee_id.strip()
    name = payload.name.strip()
    if not eid or not name:
        raise HTTPException(400, "employee_id and name required")
    existing = await db.employees.find_one({"employee_id": eid})
    if existing:
        return clean(existing)
    emp = Employee(employee_id=eid, name=name)
    await db.employees.insert_one(emp.model_dump())
    return emp.model_dump()


@api_router.post("/auth/login")
async def login(payload: EmployeeLogin):
    emp = await db.employees.find_one({"employee_id": payload.employee_id.strip()})
    if not emp:
        raise HTTPException(404, "Employee not found")
    return clean(emp)


@api_router.get("/employees")
async def list_employees():
    emps = await db.employees.find({}, {"_id": 0}).to_list(10000)
    return emps


# ---------- Matches ----------
@api_router.get("/matches")
async def list_matches():
    matches = await db.matches.find({}, {"_id": 0}).sort("kickoff", 1).to_list(1000)
    return matches


@api_router.get("/matches/{match_id}")
async def get_match(match_id: str):
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Not found")
    return m


@api_router.post("/admin/matches", dependencies=[Depends(verify_admin)])
async def create_match(payload: MatchCreate):
    m = Match(**payload.model_dump())
    await db.matches.insert_one(m.model_dump())
    return m.model_dump()


@api_router.delete("/admin/matches/{match_id}", dependencies=[Depends(verify_admin)])
async def delete_match(match_id: str):
    await db.matches.delete_one({"id": match_id})
    await db.predictions.delete_many({"match_id": match_id})
    return {"ok": True}


@api_router.post("/admin/matches/{match_id}/status", dependencies=[Depends(verify_admin)])
async def set_status(match_id: str, status: str):
    if status not in ("upcoming", "live", "finished"):
        raise HTTPException(400, "invalid status")
    await db.matches.update_one({"id": match_id}, {"$set": {"status": status}})
    return {"ok": True}


@api_router.post("/admin/matches/{match_id}/result", dependencies=[Depends(verify_admin)])
async def submit_result(match_id: str, result: MatchResult):
    match = await db.matches.find_one({"id": match_id})
    if not match:
        raise HTTPException(404, "Match not found")
    r_winner = determine_winner(result.result_a, result.result_b)
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "result_a": result.result_a,
            "result_b": result.result_b,
            "winner": r_winner,
            "status": "finished",
        }},
    )
    # Recompute points for all predictions on this match
    preds = await db.predictions.find({"match_id": match_id}).to_list(10000)
    for p in preds:
        pts = compute_points(p["winner"], p["score_a"], p["score_b"], r_winner, result.result_a, result.result_b)
        await db.predictions.update_one({"id": p["id"]}, {"$set": {"points": pts}})
    return {"ok": True, "predictions_updated": len(preds)}


# ---------- Predictions ----------
@api_router.post("/predictions")
async def submit_prediction(payload: PredictionCreate):
    emp = await db.employees.find_one({"employee_id": payload.employee_id})
    if not emp:
        raise HTTPException(404, "Employee not registered")
    match = await db.matches.find_one({"id": payload.match_id})
    if not match:
        raise HTTPException(404, "Match not found")
    if match["status"] != "upcoming":
        raise HTTPException(400, "Predictions are closed for this match")
    if payload.winner not in ("team_a", "team_b", "draw"):
        raise HTTPException(400, "Invalid winner")
    if payload.score_a < 0 or payload.score_b < 0 or payload.score_a > 30 or payload.score_b > 30:
        raise HTTPException(400, "Invalid score")
    # Auto-derive winner from score for consistency
    derived = determine_winner(payload.score_a, payload.score_b)
    winner = derived  # the score determines the winner

    existing = await db.predictions.find_one({
        "employee_id": payload.employee_id,
        "match_id": payload.match_id,
    })
    if existing:
        await db.predictions.update_one(
            {"id": existing["id"]},
            {"$set": {
                "winner": winner,
                "score_a": payload.score_a,
                "score_b": payload.score_b,
            }},
        )
        return clean(await db.predictions.find_one({"id": existing["id"]}))
    pred = Prediction(
        employee_id=payload.employee_id,
        match_id=payload.match_id,
        winner=winner,
        score_a=payload.score_a,
        score_b=payload.score_b,
    )
    await db.predictions.insert_one(pred.model_dump())
    return pred.model_dump()


@api_router.get("/predictions/me")
async def my_predictions(employee_id: str):
    preds = await db.predictions.find({"employee_id": employee_id}, {"_id": 0}).to_list(1000)
    return preds


@api_router.get("/predictions/match/{match_id}")
async def match_predictions(match_id: str):
    """Returns predictions for a match, BUT only if match is finished (anti-cheating)."""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(404, "Match not found")
    if match["status"] != "finished":
        return {"locked": True, "predictions": []}
    preds = await db.predictions.find({"match_id": match_id}, {"_id": 0}).to_list(1000)
    # enrich with employee names
    emp_ids = list({p["employee_id"] for p in preds})
    emps = await db.employees.find({"employee_id": {"$in": emp_ids}}, {"_id": 0}).to_list(10000)
    emp_map = {e["employee_id"]: e["name"] for e in emps}
    for p in preds:
        p["employee_name"] = emp_map.get(p["employee_id"], p["employee_id"])
    return {"locked": False, "predictions": preds}


# ---------- Leaderboard ----------
@api_router.get("/leaderboard")
async def leaderboard():
    """
    Anti-cheating: leaderboard only counts points from FINISHED matches.
    Updates only after admin submits result.
    """
    finished = await db.matches.find({"status": "finished"}, {"_id": 0, "id": 1}).to_list(1000)
    finished_ids = [m["id"] for m in finished]
    if not finished_ids:
        return {"entries": [], "finished_matches": 0}
    preds = await db.predictions.find(
        {"match_id": {"$in": finished_ids}}, {"_id": 0}
    ).to_list(100000)
    totals = {}
    for p in preds:
        eid = p["employee_id"]
        totals.setdefault(eid, {"employee_id": eid, "points": 0, "correct_winners": 0, "exact_scores": 0, "total_predictions": 0})
        totals[eid]["points"] += p.get("points", 0)
        totals[eid]["total_predictions"] += 1
        if p.get("points", 0) == 5:
            totals[eid]["exact_scores"] += 1
        elif p.get("points", 0) == 3:
            totals[eid]["correct_winners"] += 1
    # attach names
    emps = await db.employees.find({}, {"_id": 0}).to_list(10000)
    emp_map = {e["employee_id"]: e["name"] for e in emps}
    entries = []
    for eid, t in totals.items():
        t["name"] = emp_map.get(eid, eid)
        entries.append(t)
    entries.sort(key=lambda x: (-x["points"], -x["exact_scores"], x["name"]))
    for i, e in enumerate(entries):
        e["rank"] = i + 1
    return {"entries": entries, "finished_matches": len(finished_ids)}


# ---------- Seed World Cup ----------
WC_GROUPS = [
    # FIFA World Cup 2026 representative group stage (illustrative draw)
    ("A", "Mexico", "المكسيك", "🇲🇽", "Canada", "كندا", "🇨🇦", "2026-06-11T20:00:00Z"),
    ("A", "USA", "الولايات المتحدة", "🇺🇸", "Uzbekistan", "أوزبكستان", "🇺🇿", "2026-06-12T19:00:00Z"),
    ("B", "Argentina", "الأرجنتين", "🇦🇷", "Saudi Arabia", "السعودية", "🇸🇦", "2026-06-13T18:00:00Z"),
    ("B", "Brazil", "البرازيل", "🇧🇷", "Morocco", "المغرب", "🇲🇦", "2026-06-13T21:00:00Z"),
    ("C", "France", "فرنسا", "🇫🇷", "Senegal", "السنغال", "🇸🇳", "2026-06-14T17:00:00Z"),
    ("C", "Germany", "ألمانيا", "🇩🇪", "Japan", "اليابان", "🇯🇵", "2026-06-14T20:00:00Z"),
    ("D", "Spain", "إسبانيا", "🇪🇸", "Egypt", "مصر", "🇪🇬", "2026-06-15T18:00:00Z"),
    ("D", "Portugal", "البرتغال", "🇵🇹", "South Korea", "كوريا الجنوبية", "🇰🇷", "2026-06-15T21:00:00Z"),
    ("E", "England", "إنجلترا", "🏴", "Iran", "إيران", "🇮🇷", "2026-06-16T17:00:00Z"),
    ("E", "Netherlands", "هولندا", "🇳🇱", "Tunisia", "تونس", "🇹🇳", "2026-06-16T20:00:00Z"),
    ("F", "Italy", "إيطاليا", "🇮🇹", "Qatar", "قطر", "🇶🇦", "2026-06-17T18:00:00Z"),
    ("F", "Belgium", "بلجيكا", "🇧🇪", "Australia", "أستراليا", "🇦🇺", "2026-06-17T21:00:00Z"),
    ("A", "Mexico", "المكسيك", "🇲🇽", "USA", "الولايات المتحدة", "🇺🇸", "2026-06-18T19:00:00Z"),
    ("B", "Argentina", "الأرجنتين", "🇦🇷", "Brazil", "البرازيل", "🇧🇷", "2026-06-19T21:00:00Z"),
    ("B", "Saudi Arabia", "السعودية", "🇸🇦", "Morocco", "المغرب", "🇲🇦", "2026-06-19T18:00:00Z"),
    ("C", "France", "فرنسا", "🇫🇷", "Germany", "ألمانيا", "🇩🇪", "2026-06-20T20:00:00Z"),
    ("D", "Spain", "إسبانيا", "🇪🇸", "Portugal", "البرتغال", "🇵🇹", "2026-06-21T20:00:00Z"),
    ("E", "England", "إنجلترا", "🏴", "Netherlands", "هولندا", "🇳🇱", "2026-06-22T20:00:00Z"),
    ("F", "Italy", "إيطاليا", "🇮🇹", "Belgium", "بلجيكا", "🇧🇪", "2026-06-23T20:00:00Z"),
    ("A", "Canada", "كندا", "🇨🇦", "Uzbekistan", "أوزبكستان", "🇺🇿", "2026-06-24T19:00:00Z"),
]


@api_router.post("/admin/seed", dependencies=[Depends(verify_admin)])
async def seed():
    count = await db.matches.count_documents({})
    if count > 0:
        return {"ok": True, "skipped": True, "existing": count}
    docs = []
    for g, a, a_ar, fa, b, b_ar, fb, ko in WC_GROUPS:
        m = Match(
            team_a=a, team_b=b, team_a_ar=a_ar, team_b_ar=b_ar,
            flag_a=fa, flag_b=fb, group=g, stage="Group Stage", kickoff=ko,
        )
        docs.append(m.model_dump())
    await db.matches.insert_many(docs)
    return {"ok": True, "inserted": len(docs)}


@api_router.post("/admin/reset", dependencies=[Depends(verify_admin)])
async def reset():
    await db.matches.delete_many({})
    await db.predictions.delete_many({})
    return {"ok": True}


@api_router.get("/admin/check")
async def admin_check(x_admin_password: str = Header(None)):
    return {"ok": x_admin_password == ADMIN_PASSWORD}


@api_router.get("/")
async def root():
    return {"message": "NCC World Cup Contest API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def auto_seed():
    try:
        count = await db.matches.count_documents({})
        if count == 0:
            docs = []
            for g, a, a_ar, fa, b, b_ar, fb, ko in WC_GROUPS:
                m = Match(
                    team_a=a, team_b=b, team_a_ar=a_ar, team_b_ar=b_ar,
                    flag_a=fa, flag_b=fb, group=g, stage="Group Stage", kickoff=ko,
                )
                docs.append(m.model_dump())
            await db.matches.insert_many(docs)
            logger.info(f"Auto-seeded {len(docs)} World Cup matches")
    except Exception as e:
        logger.error(f"Seed error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
