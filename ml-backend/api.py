"""
api.py
======
FastAPI backend for the CivicTrust image verification pipeline.

Endpoints
---------
    POST /verify-image   – Upload an image; receive the full verification JSON.
    GET  /health         – Liveness check.

Run
---
    python api.py
    # or
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload

Requirements
------------
    pip install fastapi uvicorn python-multipart
    (plus all image_verifier.py dependencies)
"""

import os
import tempfile
import traceback
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from image_verifier import verify_image

# ────────────────────────────────────────────────────────────────────────────
# App setup
# ────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CivicTrust Image Verifier API",
    description=(
        "Three-layer image verification pipeline for civic complaint photos. "
        "Combines EXIF metadata analysis, Error Level Analysis (ELA), and "
        "CLIP-based category matching to produce a trust score."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow all origins so the React frontend (any port / domain) can reach this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────────────────────────────────────────────────
# Allowed image MIME types
# ────────────────────────────────────────────────────────────────────────────

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
}

_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


def _validate_upload(file: UploadFile) -> None:
    """Raise HTTPException 400 if the uploaded file is not an accepted image."""
    content_type = (file.content_type or "").lower()
    extension = Path(file.filename or "").suffix.lower()

    if content_type not in _ALLOWED_CONTENT_TYPES and extension not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{content_type}' ('{extension}'). "
                f"Accepted types: {', '.join(sorted(_ALLOWED_EXTENSIONS))}"
            ),
        )


# ────────────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Utility"])
def health_check():
    """
    Liveness probe.

    Returns ``{"status": "ok"}`` when the server is running.
    """
    return {"status": "ok"}


@app.post("/verify-image", tags=["Verification"])
async def verify_image_endpoint(
    file: UploadFile = File(...),
    complaint_address: str | None = Form(None),
):
    """
    Verify a civic complaint image through the three-layer pipeline.

    **Layers**
    - **EXIF Checker** – GPS presence, timestamp recency, camera info
    - **ELA** – Error Level Analysis for editing / manipulation detection
    - **CLIP** – Category matching against known civic issue descriptions

    **Returns** a JSON object with:
    - ``overall_trust_score`` (float 0–1)
    - ``is_suspicious`` (bool)
    - ``flags`` (list of human-readable warning strings)
    - ``detected_category`` (string, e.g. ``"pothole"``)
    - ``exif``, ``ela``, ``clip`` – per-layer detail objects
    """
    _validate_upload(file)

    # Preserve the original file extension so PIL / OpenCV recognise the format
    original_suffix = Path(file.filename or "upload").suffix or ".jpg"

    tmp_path: str | None = None
    try:
        # Write the upload to a named temp file that persists until we delete it
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=original_suffix,
            prefix="civictrust_upload_",
        ) as tmp:
            tmp_path = tmp.name
            contents = await file.read()
            tmp.write(contents)

        # Run the full verification pipeline
        result = verify_image(tmp_path, complaint_address=complaint_address)

        result_dict = result.to_dict()
        score = result_dict.get("overall_trust_score", 0.0)
        
        # Calculate trust_percentage and trust_level
        trust_percentage = max(0, min(100, int(round(score * 100))))
        if score >= 0.8:
            trust_level = 'HIGH'
        elif score >= 0.6:
            trust_level = 'MEDIUM'
        else:
            trust_level = 'LOW'

        result_dict["trust_level"] = trust_level
        result_dict["trust_percentage"] = trust_percentage

        return JSONResponse(content=result_dict)

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    except Exception as exc:
        # Log the full traceback server-side, return a clean error to the client
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {type(exc).__name__}: {exc}",
        )

    finally:
        # Always clean up the temp file, even if an exception occurred
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass  # Non-fatal – OS will clean up eventually


# ────────────────────────────────────────────────────────────────────────────
# Entry point
# ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
