# CivicTrust — Manual Integration Slots

CivicTrust is **API-first** and designed for integration with municipal and
national systems. Following the master project report's rule — *integrations
should only be claimed after actual authorisation and technical integration* —
every external system below is a **clean, reserved slot**. Nothing is
fake-wired. All core workflows run without any of these integrations.

The machine-readable registry lives in `config/integrations.json`.

---

## 1. Supabase PostgreSQL — production database
**Status: slot ready, awaiting authorised credentials**

The repository layer (`lib/repositories/`) already implements both providers;
SQLite is the local development profile, PostgreSQL the cloud profile.

```bash
# In the deployment environment:
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://...   # authorised Supabase connection string

npm run db:migrate   # applies schema.sql to PostgreSQL
npm run db:seed      # provisions officer / dept-head / admin accounts
```

Acceptance before calling the cloud deployment complete (per the master
report): **migration, insert, read, update, transaction, restart, redeploy,
persistence** — run the live lifecycle test (citizen → submit → assign →
resolve → confirm) against the production database.

## 2. BHASHINI — Indian-language AI (voice + translation)
**Status: slot ready, awaiting authorisation**

The multilingual framework (`lib/i18n.ts`, `config/translations/`) already
serves configured languages with English fallback. BHASHINI extends it to
voice-driven complaint filing ("speaks complaint in Telugu → speech
recognition → structured complaint → translation") and department-language
delivery. Plug-in point: translation resource loading + the citizen form's
voice input.

Config keys: `BHASHINI_API_KEY`, `BHASHINI_BASE_URL`.

## 3. SMS notifications
**Status: slot ready, awaiting provider account**

Notifications are already persisted in-app (`notifications` table, citizen
notification centre). SMS is an additive dispatch channel on top of
`createNotification` — never a dependency of the core workflow.

Config keys: `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`.

## 4. WhatsApp Business / authorised government messaging
**Status: slot ready**

Same dispatch point as SMS. Config keys: `WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_ID`.

## 5. API Setu — government interoperability
**Status: slot ready, awaiting authorisation**

CivicTrust does **not** claim to replace CPGRAMS or any national grievance
platform. Its differentiation is evidence verification + location-aware civic
workflow + field-resolution verification + the accountability chain. Where
authorised, CPGRAMS-related APIs exposed through API Setu can connect at the
API layer.

Config keys: `API_SETU_CLIENT_ID`, `API_SETU_SECRET`.

## 6. Government identity integration (OTP / official identity)
**Status: slot ready**

Current authentication is scrypt credentials + signed HttpOnly sessions.
OTP-based login and government identity verification plug in at
`/api/auth/login` and `/api/auth/register`.

Config keys: `OTP_PROVIDER_KEY`, `GOV_IDENTITY_ENDPOINT`.

## 7. GIS provider — ward maps / field routes
**Status: slot ready**

The jurisdiction boundary is already configuration-driven
(`config/jurisdiction.config.json → deployment.boundaryDataset`). A new
deployment ships its own boundary file; richer tile/map providers attach via
`GIS_TILE_URL` when authorised.

---

## Adding a new deployment (jurisdiction profile)

1. Copy `config/jurisdiction.config.json`.
2. Fill in: state, district, local body, hierarchy, departments, service
   categories, SLA policies, languages, and the boundary dataset path.
3. Ship the boundary GeoJSON and point `deployment.boundaryDataset` at it.
4. Restart. No application code changes — **configuration instead of
   hard-coding**.
