# NCC World Cup Contest — PRD

## Original Problem Statement
> "مرحبا احتاج موقع اكتروني مسابقات عندي في الشركة وقت كاس العالم كل يوم مبارة تحدد من الفائز وكم النتجية واسم الموظف ورقمة الوظيفي تمام"

A bilingual (Arabic/English) employee-only prediction contest for World Cup matches at شركة العناية الوطنية / National Care Co. Each match: pick the winner and the exact score. Employees register with name + employee ID only.

## User Personas
- **Employee participant**: Logs in with name + employee ID, predicts matches, checks own stats and leaderboard rank.
- **HR/Contest Admin**: Holds admin password, enters official match results to close matches and update the leaderboard. Anti-cheating: leaderboard only counts finished matches.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). Collections: `employees`, `matches`, `predictions`. Auto-seeds 20 WC 2026 group stage matches on first startup.
- **Frontend**: React 19 + TailwindCSS + shadcn/ui + sonner + lucide-react. Bilingual with custom `I18nProvider` and dynamic `dir=rtl/ltr`.
- **Auth**: Passwordless employee registration. Admin via `X-Admin-Password` header (env `ADMIN_PASSWORD=ncc-admin-2026`).

## Implementation Status (Feb 2026)
- [x] Backend models, CRUD, admin protected routes
- [x] Auto-seed 72 World Cup 2026 group-stage matches (12 groups A–L from official Dec 5, 2025 draw)
- [x] Prediction submission with auto-derived winner; locks 5 minutes before kickoff
- [x] **FIXED (Feb 2026)**: `POST /api/predictions` was missing decorator/`async def` — orphaned function body. Restored route.
- [x] Admin result submission + automatic point recomputation (5 exact / 3 winner / 0 wrong)
- [x] Anti-cheating leaderboard (only finished-match points)
- [x] XLSX exports (per-match + all-predictions) using openpyxl
- [x] Stream URL field on matches (`POST /api/admin/matches/{id}/stream`)
- [x] Notifications collection + auto-schedule kickoff reminders
- [x] Stats endpoints: `/stats/teams`, `/stats/match/{id}`, `/stats/overview`
- [x] Winners-of-latest-finished-match endpoint
- [x] Bilingual UI (AR default, EN toggle) with full RTL support
- [x] Pages: Home, Register, Matches, MyPredictions, Leaderboard, Admin
- [x] NCC logo + brand palette mixed with Saudi green + gold accents

## Core Requirements (Static)
1. Q1 winner, Q2 exact score
2. Pre-loaded fixture list
3. Passwordless registration (name + ID)
4. Anti-cheat leaderboard updates only after admin closes a match
5. AR/EN bilingual + RTL
6. NCC brand mixed with national team colors

## Prioritized Backlog
### P1
- WC knockout stage matches (round-of-16, QF, SF, Final) - currently group stage only
- Match start countdown timer on cards
- Employee profile editing (current behavior keeps first name on idempotent register)

### P2
- Public match history with revealed predictions after each match (anti-cheating reveal)
- Push reminders via email/Telegram before each match
- Department/team competitions
- Export leaderboard to CSV/PDF for HR

### P3
- React Router navigate() instead of window.location for unauth predict click
- POST /admin/matches/{id}/status accept JSON body instead of query param
- Rate-limit /api/auth/register
