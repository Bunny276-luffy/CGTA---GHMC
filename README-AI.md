# CivicTrust AI & Verification Architecture

This document outlines the local-first AI and forensic verification architecture powering the CivicTrust platform. The system operates autonomously using localized models and deterministic analysis, ensuring resilience, privacy, and continuous offline availability without reliance on external paid cloud AI APIs.

## 1. System Architecture overview

CivicTrust employs a strictly gated **13-stage deterministic and AI-assisted verification pipeline**.
AI is treated strictly as an **untrusted supporting signal** rather than a sole source of truth.

The architecture ensures that if an AI model is unavailable, fails, or produces anomalous results, the pipeline gracefully degrades to an `UNAVAILABLE` state and relies on deterministic forensics, ultimately resulting in a `REQUIRES_MANUAL_REVIEW` decision rather than falsely blocking or passing a complaint.

### The Hybrid Pipeline
1. **Deterministic Forensics** (File integrity, Hash duplicates, ELA manipulation analysis, EXIF extraction, GHMC point-in-polygon geofencing, Timestamps).
2. **Local AI Analysis** (Object detection, Optical Character Recognition).
3. **Context Engine** (Aggregates GPS, timestamps, OCR text, objects, and duplicate checks into a holistic context score).
4. **Trust Scoring** (Produces a final 0-100 score).

---

## 2. Integrated Open-Source Models

CivicTrust deliberately utilizes ultra-lightweight, edge-compatible models designed to run inside the Node.js/browser environments using WebAssembly (Wasm) and ONNX Runtime.

### A. YOLOS-Tiny (Object Detection)
* **Role:** Detects physical objects in uploaded images (e.g., cars, trash) to ensure the visual contents match the complaint category (e.g., "Pothole" complaints should ideally feature roads or vehicles).
* **Model Implementation:** `Xenova/yolos-tiny` via the `@xenova/transformers` library.
* **License:** 
  * Model (`hustvl/yolos-tiny` / `Xenova/yolos-tiny`): **Apache 2.0**
  * Runtime Library (`@xenova/transformers`): **Apache 2.0**
* **Runtime Requirements:** Uses ONNX Runtime. Consumes ~30MB of RAM. Requires no GPU (CPU execution is sufficiently fast for this use case).
* **Offline Capability:** Fully offline. Model assets are cached locally in `data/models/`.

### B. Tesseract.js (Optical Character Recognition)
* **Role:** Extracts visible text from images (e.g., street signs, shop banners) to cross-reference with provided location keywords (e.g., "Jubilee Hills", "Road No 36").
* **Model Implementation:** `tesseract.js` (WebAssembly port of the Tesseract OCR Engine).
* **License:** 
  * Engine / Library (`tesseract.js`): **Apache 2.0**
  * Training Data (`eng.traineddata`): **Apache 2.0**
* **Runtime Requirements:** Node.js WebAssembly runtime. Consumes ~25-50MB RAM.
* **Offline Capability:** Fully offline. Training data is cached in `data/ocr/`.

---

## 3. Why No Additional AI Models Were Integrated

Following a comprehensive open-source AI audit, the decision was made **not** to integrate additional heavy models (e.g., LLaVA, Moondream, Qwen-VL, DETR, MiniLM).

**Rationale:**
1. **Serverless Limits:** The current local AI components (`yolos-tiny`, `tesseract.js`) are extremely lightweight and edge-friendly. Integrating multi-gigabyte Vision-Language models would consume excessive RAM, severely degrade cold-start performance, and exceed the strict memory constraints of Vercel/Netlify serverless deployments.
2. **API Independence:** Connecting to external cloud providers (e.g., OpenAI, HuggingFace APIs) violates the requirement for offline, independent local capabilities and introduces unnecessary failure points.
3. **Sufficiency:** The existing combination of deterministic forensics (EXIF, GPS, Geofencing, ELA) combined with basic object detection and OCR is sufficiently powerful to generate a robust Trust Score. 

**Note on Deployment Readiness:** While the AI components themselves are perfectly capable of running locally or on serverless edges due to their low resource footprint, the *overall* deployment readiness of CivicTrust for public production ultimately depends on the hosting architecture (e.g., moving the current local SQLite persistence to a remote PostgreSQL provider like Supabase).

---

## 4. Failure & Fallback Behavior

In alignment with strict forensic requirements, AI models are explicitly prohibited from becoming a Single Point of Failure (SPOF) or fabricating data.

* **Missing / Corrupted Models:** Detected during `npm run preflight`. The engine safely ignores the AI stage and sets the specific signal classification (e.g., `ocrClassification`) to `UNAVAILABLE`.
* **Inference Failures (e.g., OOM, Malformed Image):** Wrapped in safe `try/catch` blocks. The verification engine degrades the specific stage to `UNAVAILABLE`.
* **Impact on Trust Score:** An `UNAVAILABLE` AI signal reduces the total possible confidence weight. If insufficient evidence exists, the system automatically grades the complaint as `SUSPICIOUS` or triggers a `REQUIRES_MANUAL_REVIEW` tag. It never defaults to `PASS`.

This ensures the platform maintains operational integrity regardless of the underlying hardware constraints or AI execution status.
