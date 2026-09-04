# CivicTrust (CGTA) — AI Grievance Verification & Trust Platform

> [!IMPORTANT]
> **Active Runtime Configuration**: The canonical application is the root Next.js application. The subdirectory `apps/web` is NOT part of the active runtime environment and is bypassed. Do not delete `apps/web` as it is preserved for reference.

CivicTrust is a production-ready, AI-powered civic grievance verification and trust platform. It is designed for municipal corporations (like the Greater Hyderabad Municipal Corporation - GHMC or Brihanmumbai Municipal Corporation - BMC) to ingest citizen complaints (potholes, sewerage leaks, broken lights) while automatically auditing the authenticity of evidence using an independent verification pipeline before routing tasks to field officers.

---

## 🚀 Key Functional Features

1. **3D Digital Twin Globe & Heatmap**: Immersive, zero-dependency interactive canvas animations showing complaint hotspots and georeferenced city decay indices.
2. **AI Multimodal Verification Engine**: 
   * **EXIF software integrity scanner** to block deepfakes or edited submissions (e.g. Photoshop).
   * **Haversine geofence calculation** verifying field officer resolution photos are taken within 100 meters of the original grievance.
   * **Spatial duplicate clustering** grouping incidents within 50 meters into single Master Tickets.
3. **Citizen Dashboard**: Portal to file complaints with location metadata, review timelines, and confirm or reject officer resolutions.
4. **Officer Dashboard**: Interactive radar HUD geofence monitor displaying assigned tasks and accepting GPS-validated resolution uploads.
5. **Admin Control Center**: Visualizes operations graphs, adjusts AI configuration parameters (weights, radius distance thresholds), and arbitrates disputed rejections.
6. **Third-Party Arbitration (TPA)**: Automatically locks tickets and escalates cases to neutral auditor review if a citizen rejects resolutions twice.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 15, React 19 (TypeScript), Tailwind CSS v4 (with PostCSS), Framer Motion, HTML5 Canvas 3D Graphics.
* **Backend APIs**: Next.js API route handlers for user workflows, sessions, and database coordination.
* **AI Service Engine**: FastAPI (Python 3.10), Uvicorn, mathematical coordinate geofencing, and metadata parsers.
* **Database & ORM**: PostgreSQL, Prisma ORM.
* **DevOps**: Docker & Docker Compose.

---

## 📁 Repository Directory Structure

```
CGTA---GHMC-main/
├── docker-compose.yml             # Container orchestration (Web, AI Engine, Postgres)
├── .gitignore                     # Git ignore parameters
├── README.md                      # Platform documentation
├── apps/
│   ├── web/                       # Next.js Application
│   │   ├── app/                   # App Router (pages: citizen, officer, admin, login, register, api)
│   │   ├── components/            # Interactive graphics components (ThreeGlobe)
│   │   ├── lib/                   # Database (Prisma) and cryptography helpers
│   │   ├── prisma/                # Prisma schema definitions
│   │   ├── package.json           # Node configuration
│   │   └── Dockerfile             # Multi-stage production build script
│   │
│   └── ai-service/                # Python FastAPI AI Engine
│       ├── main.py                # Verification calculations (EXIF, geofencing, duplicate checks)
│       ├── requirements.txt       # Python package requirements
│       └── Dockerfile             # Fast deployment image
```

---

## 🐳 Quick Local Start Instructions

You can spin up the entire production-ready ecosystem locally in one command:

```bash
docker compose up --build
```

This will automatically configure:
1. **Database**: PostgreSQL container running on port `5432` with automatically mapped storage volumes.
2. **AI Engine Service**: FastAPI microservice running on port `8000`. You can inspect the interactive OpenAPI Swagger docs at `http://localhost:8000/docs`.
3. **Web Application**: Next.js portal running on port `3000`. Open `http://localhost:3000` to access the portal.

### Testing Roles Credentials:
For fast testing when the database is first initialized, the auth router supports an automatic role mapper by evaluating email keywords:
* Use `admin@civictrust.gov.in` to login directly as **Super Administrator**.
* Use `officer@civictrust.gov.in` to login directly as **Field Officer**.
* Any other email logs in as a standard **Citizen**.
