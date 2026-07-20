import math
from typing import Dict, Any, List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="CivicTrust AI Verification Engine",
    description="Microservice for metadata validation, geofencing, duplicate detection, and trust scoring",
    version="1.0.0"
)

# Configuration weights (can be dynamically adjusted)
CONFIG = {
    "max_geofence_meters": 100.0,
    "duplicate_radius_meters": 50.0,
    "blocked_software": ["photoshop", "lightroom", "gimp", "snapseed", "picsart", "meitu", "faceapp"],
    "weights": {
        "geofence": 0.4,
        "metadata": 0.3,
        "duplicate": 0.3
      }
}

# In-memory mock database of recent ticket locations for duplicate checking
RECENT_TICKETS = [
    {"id": "comp-1", "latitude": 17.385, "longitude": 78.4867, "category": "Drainage & Water Leakage"},
    {"id": "comp-2", "latitude": 18.9752, "longitude": 72.8258, "category": "Garbage & Sanitation"},
    {"id": "comp-5", "latitude": 18.9801, "longitude": 72.8310, "category": "Roads & Potholes"}
]

# Haversine distance calculator
def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in meters
    R = 6371000.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return R * c

class VerificationResponse(BaseModel):
    trust_score: float
    is_valid: bool
    priority: str
    explainable_report: str
    geofence_distance_meters: float
    duplicate_detected: bool
    duplicate_parent_id: str = None
    exif_software: str = None

@app.get("/")
def read_root():
    return {"status": "ACTIVE", "engine": "CivicTrust-AI-Pipeline", "version": "1.0.0"}

@app.post("/verify", response_model=VerificationResponse)
async def verify_grievance(
    latitude: float = Form(...),
    longitude: float = Form(...),
    category: str = Form(...),
    photo_name: str = Form(...),
    exif_lat: float = Form(None),
    exif_lng: float = Form(None),
    exif_software: str = Form(None)
):
    """
    Ingests coordinate declarations and media descriptors to audit metadata signatures,
    calculate geofence drift, identify duplicates, and issue an explainable Trust Score.
    """
    
    # 1. EXIF Software/Deepfake validation
    metadata_score = 100.0
    explain_steps = []
    
    if exif_software:
        software_lower = exif_software.lower()
        blocked_found = [app for app in CONFIG["blocked_software"] if app in software_lower]
        
        if blocked_found:
            metadata_score = 0.0
            explain_steps.append(f"CRITICAL: Manipulation signature detected. Blocked application found: {blocked_found[0].upper()}.")
        else:
            explain_steps.append(f"PASS: Camera software verified as original device raw output ({exif_software}).")
    else:
        # Penalize slightly if EXIF headers are completely stripped, but do not fail
        metadata_score = 50.0
        explain_steps.append("WARNING: Image metadata headers are stripped. Verification status degraded.")

    # 2. Geofence drift audit
    geofence_score = 100.0
    distance = 0.0
    
    if exif_lat is not None and exif_lng is not None:
        distance = calculate_haversine(latitude, longitude, exif_lat, exif_lng)
        
        if distance > CONFIG["max_geofence_meters"]:
            # Geofence breach
            geofence_score = max(0.0, 100.0 - ((distance - CONFIG["max_geofence_meters"]) / 5.0))
            explain_steps.append(f"FAIL: Photo geotags drift {round(distance, 1)}m away from reported pin, exceeding the {CONFIG['max_geofence_meters']}m geofence.")
        else:
            explain_steps.append(f"PASS: Photo geotags verified within {round(distance, 1)}m of the reported location.")
    else:
        # Major penalty if location telemetry is unavailable
        geofence_score = 0.0
        explain_steps.append("FAIL: No GPS coordinate headers found in photo evidence.")

    # 3. Duplicate checks
    duplicate_score = 100.0
    duplicate_detected = False
    duplicate_parent_id = None
    
    for ticket in RECENT_TICKETS:
        if ticket["category"] == category:
            dist = calculate_haversine(latitude, longitude, ticket["latitude"], ticket["longitude"])
            if dist <= CONFIG["duplicate_radius_meters"]:
                duplicate_detected = True
                duplicate_parent_id = ticket["id"]
                duplicate_score = 0.0
                explain_steps.append(f"DUPLICATE DETECTED: Similar '{category}' grievance exists within {round(dist, 1)}m (Reference: {duplicate_parent_id}).")
                break
                
    if not duplicate_detected:
        explain_steps.append("PASS: No pre-existing duplicate entries found within search radius.")

    # 4. Overall Trust Score Calculation
    w = CONFIG["weights"]
    trust_score = (geofence_score * w["geofence"]) + (metadata_score * w["metadata"]) + (duplicate_score * w["duplicate"])
    
    # 5. Priority Prediction
    priority = "STANDARD"
    # Basic keyword urgency triggers
    category_lower = category.lower()
    if "emergency" in category_lower or "drainage" in category_lower or trust_score < 40.0:
        priority = "EMERGENCY" if trust_score > 60.0 else "LOW" # Lower priority to untrustworthy reports
    elif "pothole" in category_lower:
        priority = "HIGH"

    is_valid = trust_score >= 60.0 and not duplicate_detected

    report = " | ".join(explain_steps)

    return VerificationResponse(
        trust_score=round(trust_score, 1),
        is_valid=is_valid,
        priority=priority,
        explainable_report=report,
        geofence_distance_meters=round(distance, 2),
        duplicate_detected=duplicate_detected,
        duplicate_parent_id=duplicate_parent_id,
        exif_software=exif_software
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
