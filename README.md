# CivicTrust (CGTA) — Evidence-Backed Civic Grievance & Accountability Platform

> CivicTrust turns a civic complaint into a verifiable accountability chain — from citizen
> evidence and location, through AI-assisted verification and municipal assignment, to
> GPS-verified resolution and citizen confirmation.

> [!NOTE]
> **Scope statement.** CivicTrust is a project implementation modelled on the current GHMC
> 6-zone / 30-circle / 150-ward administrative structure. It is **not** an official GHMC or
> Government of Telangana deployment, and it makes no certification or affiliation claims.

## 1. What CivicTrust Is

CivicTrust is a closed-loop civic accountability system — not just a complaint form:

```
Citizen → Report → Evidence → Verification → Jurisdiction → Priority
        → Department / Officer → Field Resolution → Resolution Evidence
        → Verification → Citizen Confirmation → Audit Trail
```

The core question it answers: **how do you make a civic complaint traceable from evidence
to resolution?**

## 2. The Five Applications

| Application | Route | Experience | Role |
|---|---|---|---|
| Landing page | `/` | Public introduction (Capture → Locate → Verify → Route → Resolve → Confirm). Administrative roles are never exposed as navigation. | Public |
| Citizen app | `/login`, `/register`, `/citizen` | Mobile-first PWA: capture photo + GPS + category + severity, evidence verification, track the lifecycle, confirm or dispute resolution. | CITIZEN |
| Officer app | `/officer/login`, `/officer` | Mobile-first field ops: priority queue of assigned grievances, on-site GPS validation, resolution photo + field note (submitting "Resolved" without evidence is rejected). | OFFICER |
| Department head | `/dept-head/login`, `/dept-head` | Desktop/tablet oversight: workload, SLA-policy overdue tracking, review → assign → prioritise → monitor → escalate. | DEPT_HEAD (and ADMIN) |
| Admin console | `/admin/login`, `/admin` | Governance: grievance ledger, verification analytics, audit ledger, user directory, officer assignment. | ADMIN |

## 3. The 13-Stage Verification Engine

1. **File validation** — type, size, readability
2. **Image quality** — usable vs. unusable evidence
3. **EXIF extraction** — timestamp / GPS / camera metadata (supporting evidence, not truth)
4. **ELA manipulation analysis** — a signal, never proof of fraud
5. **GPS verification** — Haversine-based consistency checks
6. **GHMC geofencing** — point-in-polygon check against the supported boundary
7. **Timestamp verification** — temporal consistency
8. **OCR** — local Tesseract.js text extraction
9. **AI object detection** — local YOLOS-Tiny visual context
10. **Duplicate detection** — exact (SHA-256) and near-duplicate (dHash)
11. **Context verification** — all signals correlated
12. **Trust score** — 0–100 evidence-based assessment
13. **Explainable report** — signals, reasons, warnings, recommended priority

**AI philosophy:** AI assists the decision process; it does not become the authority.
Critical decisions are governed by deterministic rules (role transitions, geofence
tolerance, jurisdiction checks).

## 4. Security Model

- **Sessions** — HMAC-SHA256 signed, HttpOnly, SameSite=Lax cookies (Web Crypto; verified in
  Edge middleware and API routes). Clients cannot forge roles.
- **Passwords** — scrypt with per-user random salts. Legacy unsalted SHA-256 hashes are
  transparently upgraded on the next successful login.
- **Registration** — self-registration creates CITIZEN accounts only; officer/admin provisioning
  is administrative.
- **Authorization** — every API route re-verifies the session and role server-side
  (Citizen ≠ Officer ≠ Dept Head ≠ Admin). Status transitions are whitelisted per role.
- **IDOR protection** — user-scoped queries are derived from the session, not request
  parameters; citizens can only act on their own grievances.
- **Fail closed** — authentication failure, GPS unavailability, evidence validation failure, and
  database outages all DENY rather than fall back to fake data. The UI shows explicit
  "DATABASE UNAVAILABLE" states and never fabricates content.
- **Officer resolution integrity** — resolving requires a photo (≤6 MB), a field note (≥10
  chars), and on-site GPS. The server computes the real geofence delta; outside the 100 m
  tolerance the ticket is routed to third-party audit instead of being marked resolved.
- **Rate limiting** — login (brute-force), registration, verification pipeline, submissions,
  tracking, and public stats all run through a sliding-window limiter.
- **Input validation** — server-side sanitization, category/severity whitelists, coordinate
  ranges, and payload size caps on every route.
- **Audit trail** — logins, registrations, submissions, status changes (with geofence facts),
  and logout events are recorded with actor and IP.
- **Transport & headers** — HSTS, X-Frame-Options: DENY, nosniff, strict Referrer-Policy, and a
  restrictive Permissions-Policy (camera/geolocation self only).

## 5. Data Architecture

Entities: `users`, `complaints`, `evidence`, `ai_reports`, `notifications`, `audit_logs`.

A repository abstraction (`lib/repositories/`) keeps the application identical across:
- **SQLite** (better-sqlite3) for local development
- **PostgreSQL / Supabase** for deployed environments

## 6. No Fake Data Policy

The deployed application contains **no** fake complaints, users, assignments, notifications,
dashboard numbers, stock evidence, or fabricated statistics. Empty ledger = empty states.
Public statistics (`/public-stats`, `/api/public/stats`) are computed live from the ledger and
show zeros when nothing has been filed.

## 7. Technology Stack

- **Frontend** — Next.js 15, React 19 (TypeScript), Tailwind CSS v4, Framer Motion, Lucide, PWA
- **Backend** — Next.js API routes (Node runtime), repository pattern, Web Crypto sessions
- **Database** — SQLite (dev) / PostgreSQL + Supabase (deployed)
- **AI / CV (local)** — Transformers.js YOLOS-Tiny, Tesseract.js OCR, EXIF parsing, ELA,
  SHA-256, dHash, Haversine geofencing
- **Deployment** — GitHub → Render → Next.js + Supabase PostgreSQL

## 8. Maturity Levels (stated honestly)

The complete, maintained status table lives in **[PROJECT-STATUS.md](./PROJECT-STATUS.md)**.

**Implemented** — Next.js app (citizen/officer/dept-head/admin), role-based auth with signed
sessions, evidence workflow, 13-stage verification engine (OCR, object detection, EXIF, ELA,
GPS/geofence, duplicate detection, trust score, XAI report), repository/database abstraction,
notifications, audit ledger, public statistics, security hardening, responsive/PWA foundation,
**jurisdiction configuration engine** (deployment profile: departments, categories, SLA policies,
escalation rules, languages), department routing, config-driven SLA + escalation engines,
**multilingual framework** (English/Hindi/Telugu), accessibility controls (text scaling, high
contrast, reduced motion, skip link), low-bandwidth Lite Mode, offline draft + pending-sync,
public tracking, privacy notice and terms of use.

**Integration / deployment pending** — production Supabase migration at scale, full end-to-end
persistence verification on the deployed instance. Every manual external integration (BHASHINI,
SMS, WhatsApp, API Setu, government identity, GIS) has a **reserved slot** documented in
**[INTEGRATIONS.md](./INTEGRATIONS.md)** — claimed only after actual authorisation and technical
integration, never fake-wired.

**Future / extension (roadmap, not implemented)** — issue clustering and citizen-to-issue
merging (multiple complaints describing the same real-world problem), advanced hotspot
analytics, voice-first reporting, real government-system integration, production GIS datasets,
advanced SLA prediction.

## 9. Development

```bash
npm install
npm run db:migrate    # initialize the SQLite schema
npm run db:seed       # provision officer / dept-head / admin accounts
npm run dev           # http://localhost:3000
npm run build         # production build
npm run preflight     # environment sanity checks
```

Deploying for a different jurisdiction? Copy `config/jurisdiction.config.json`, fill in the
local body's departments/categories/SLA/languages, and ship its boundary dataset — no
application code changes. See INTEGRATIONS.md §"Adding a new deployment".

Environment variables: see `.env.example`. `AUTH_SECRET` / `NEXTAUTH_SECRET` signs session
cookies — set a strong random value and keep it secret.
