# CivicTrust — Final Development Status

Honest status per the master project report's §79 categories, updated after
the India-ready implementation pass. This document follows the report's
accuracy policy: no capability is claimed beyond what the code demonstrates.

## Status Table

| Area | Status |
|---|---|
| CivicTrust core concept | **Defined** |
| GHMC pilot architecture | **Implemented** (as a jurisdiction deployment profile) |
| Citizen application architecture | **Implemented** |
| Officer application architecture | **Implemented** |
| Department Head console | **Implemented** |
| Admin console | **Implemented** |
| Jurisdiction Configuration Engine | **Implemented** (config/jurisdiction.config.json + lib/config.ts) |
| Department configuration & routing | **Implemented** (category → department, config-driven) |
| SLA engine | **Implemented** (config-driven deadlines, warning + overdue states) |
| Escalation engine | **Implemented** (deterministic SLA-breach escalation, audited, notified) |
| Multilingual framework | **Implemented** (en/hi/te core strings, config languages, English fallback) |
| BHASHINI integration | **Future/integration stage** (slot reserved — INTEGRATIONS.md) |
| Accessibility (WCAG 2.1 AA target) | **Implemented baseline** (skip link, focus rings, reduced motion, aria labels, text scaling, high-contrast mode; formal GIGW validation pending) |
| Low-bandwidth Lite Mode | **Implemented** (disables 3D/cursor effects; auto-on for reduced-motion users) |
| Offline draft / sync | **Implemented baseline** (localStorage autosave, restore, offline queue with automatic submit + server confirmation; production-grade service-worker sync pending) |
| Public transparency | **Implemented** (/public-stats + /api/public/stats, real aggregates only) |
| Complaint tracking (public) | **Implemented** (/track, tracking-ID lifecycle view) |
| PWA | **Implemented foundation** (manifest, service worker, installability) |
| Responsive design (320px+) | **Implemented** |
| Verification engine (13 stages) | **Implemented** |
| OCR | **Implemented** |
| Object detection | **Implemented** |
| Duplicate detection | **Implemented** (exact + near-duplicate; clustering = Future) |
| GPS verification | **Implemented** (configurable tolerance) |
| Geofencing | **Implemented** (config-driven boundary dataset) |
| Trust score | **Implemented** |
| XAI report | **Implemented** |
| Repository DB architecture | **Implemented** |
| Local SQLite | **Implemented** |
| PostgreSQL repository | **Implemented** |
| Render deployment | **Live** |
| Supabase PostgreSQL | **Slot ready — pending authorised migration + persistence test** |
| Issue clustering ("Issue" vs "Complaint") | **Future** (Phase 2/3) |
| Public transparency analytics | **Future/refinement** |
| Rural/Panchayat workflows | **Future expansion** (jurisdiction engine is the enabler) |
| Government integrations | **Future/authorised integration** (slots reserved) |
| GIGW/WCAG formal validation | **Needs formal testing** |
| Voice-first reporting | **Future** (BHASHINI slot) |
| SMS notifications | **Slot ready** |
| Predictive maintenance | **Future** |

## Security posture (implemented)

- HMAC-SHA256 signed HttpOnly sessions (Web Crypto, verified in Edge
  middleware + API routes), protocol-aware Secure flag, duplicate-cookie
  hardening, protocol-correct `no-store` on session endpoints.
- scrypt password hashing with transparent legacy-SHA-256 upgrade.
- Registration locked to CITIZEN; staff provisioning via `npm run db:seed`.
- Server-side authorization on every route; per-role whitelisted status
  transitions; IDOR-safe scoping; rate limiting; input validation; payload
  caps; audit ledger with actor/IP; security headers.
- Fail-closed everywhere: authentication failure → deny; database failure →
  explicit "DATABASE UNAVAILABLE" (never fake data); GPS failure → submission
  blocked / resolution routed to audit; resolution without evidence → rejected.
- Officer resolution integrity: photo + field note + on-site GPS required;
  real server-side geofence delta; outside tolerance → third-party audit.

### Dependency security & audit status (Sprint 2 — Steps A, B1, B2)

- **Next.js & PostCSS Core Updates:** `next` updated to `15.5.27` and direct `postcss` updated to `8.5.29`. Targeted override (`"next": { "postcss": "$postcss" }`) deduplicates Next.js internal PostCSS to the patched root version, eliminating nested PostCSS vulnerabilities.
- **Protobuf Transitive Override:** `onnx-proto@4.0.4` dependency `protobufjs` overridden to `7.6.6` (`"onnx-proto": { "protobufjs": "7.6.6" }`), resolving transitive prototype pollution advisories. The override successfully decoded model weights and passed the tested ONNX/YOLOS-tiny inference pipeline; universal compatibility across all Protobuf features is not claimed.
- **Automated Validation Results (Verified):**
  - **Verification Pipeline (`scripts/test-verification.ts`):** Passed with exit code 0. Verified genuine ONNX weight decoding and execution in Stage 9 (YOLOS-tiny detected `'car'` at 55.6% confidence on a 1024x1024 fixture).
  - **Evidence Integrity Suite (`scripts/test-evidence-integrity.ts`):** Passed with exit code 0 across all 10 tamper detection, byte-hashing, and coordinate-drift scenarios.
  - **CAPTCHA Security Suite (`scripts/test-captcha-security.ts`):** Passed with exit code 0 across all 9 core security scenarios and 12 route-level checks.
  - **Production Build (`npm run build`):** Passed with exit code 0; all 31 routes and edge middleware compiled without type or lint errors.
- **Residual Audit Findings & Risks (High Severity):**
  - Two high-severity advisories remain in `sharp <=0.35.5-rc.1` (inherited `libvips`, `libheif`, and `librsvg` vulnerabilities). Reported dependency paths:
    - `node_modules/@xenova/transformers/node_modules/sharp`
    - `node_modules/sharp` (via `@xenova/transformers`)
  - **Exploitability & Remediation Status:** Exploitability assessment and safe remediation remain pending isolated investigation. Upload validation must not be assumed to fully mitigate these underlying image-parsing advisories.
  - **Dangerous Command Constraint:** `npm audit fix --force` must **not** be used as it forces a breaking downgrade of `@xenova/transformers` to `1.4.2`, which removes ONNX Runtime support and breaks Stage 9 AI image verification.
  - **Platform Security Posture:** The application is explicitly not claimed to be vulnerability-free or fully production-secure.

## The 3-layer product

- **Layer 1 — Citizen Trust:** mobile-first reporting, evidence, GPS,
  languages (en/hi/te), accessibility controls, Lite Mode, tracking
  (/track), confirmation/dispute, notifications.
- **Layer 2 — Government Action:** verification engine, department routing,
  assignment, config-driven SLA, officer field workflow with geofence,
  resolution evidence + verification, escalation.
- **Layer 3 — Public Accountability:** audit ledger, public transparency
  dashboard, verification analytics, tracking.

**One-line identity:** CivicTrust turns a civic complaint into a verifiable
accountability chain — from citizen evidence and location, through
AI-assisted verification and municipal assignment, to field-level resolution
and auditable closure.

**Accuracy policy:** the platform never claims "100% accurate AI" or a
government deployment. It is a CivicTrust/CGTA-GHMC pilot/prototype platform
designed around GHMC civic workflows and architected for broader
local-government deployment via configuration.
