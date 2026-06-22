"""
image_verifier.py
=================
Three-layer verification pipeline for civic complaint photos (CivicTrust / CGTA-GHMC).

Layer 1 – EXIF Checker
    Reads raw EXIF metadata to verify GPS presence, recency of timestamp,
    and camera hardware info.

Layer 2 – ELA (Error Level Analysis)
    Re-saves the image at reduced JPEG quality and measures per-pixel
    differences to surface regions that were edited after the original
    compression.

Layer 3 – CLIP Similarity
    Uses openai/clip-vit-base-patch32 (via HuggingFace transformers) to
    compute cosine similarity between the image and textual descriptions of
    known civic issue categories.

Final Result
    Combines all three scores into a single VerificationResult with an
    overall trust score, a boolean is_suspicious flag, a list of human-
    readable flags, and the detected civic category.

Usage
-----
    python image_verifier.py --image path/to/photo.jpg
    python image_verifier.py --image photo.jpg --ela-threshold 12 --clip-threshold 0.22

Requirements
------------
    pip install pillow numpy opencv-python transformers torch exifread
"""

from __future__ import annotations

import argparse
import io
import json
import os
import warnings
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ExifTags

# Silence noisy HuggingFace warnings during import
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)


# ────────────────────────────────────────────────────────────────────────────
# Result types
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class ExifResult:
    has_gps: bool
    has_timestamp: bool
    timestamp_within_30_days: bool
    has_camera_info: bool
    gps_coords: Optional[Tuple[float, float]]   # (lat, lon) or None
    camera_make: Optional[str]
    camera_model: Optional[str]
    image_timestamp: Optional[str]
    trust_score: float                           # 0–1 (higher = more trustworthy)
    flags: List[str] = field(default_factory=list)


@dataclass
class ElaResult:
    manipulation_score: float    # 0–1 (higher = more likely edited)
    mean_diff: float             # average per-pixel ELA difference
    max_diff: float              # maximum per-pixel ELA difference
    high_diff_ratio: float       # fraction of pixels above anomaly threshold
    flags: List[str] = field(default_factory=list)


@dataclass
class ClipResult:
    detected_category: str
    match_score: float           # cosine similarity 0–1
    all_scores: Dict[str, float]
    flags: List[str] = field(default_factory=list)


@dataclass
class VerificationResult:
    overall_trust_score: float   # 0–1
    is_suspicious: bool
    flags: List[str]
    detected_category: str
    exif: ExifResult
    ela: ElaResult
    clip: ClipResult
    gps_location_match: bool = True
    detected_gps_city: str = None
    is_duplicate: bool = False
    duplicate_similarity: float = 0.0
    is_stock_photo: bool = False
    fft_anomaly_score: float = 0.0
    fft_flagged: bool = False
    weather_match: bool = True
    weather_conditions: str = None
    weather_flagged: bool = False
    shadow_consistent: bool = True
    sun_azimuth: float = None
    shadow_flagged: bool = False

    def to_dict(self) -> dict:
        res = asdict(self)
        res.update({
            "gps_location_match": self.gps_location_match,
            "detected_gps_city": self.detected_gps_city,
            "is_duplicate": self.is_duplicate,
            "duplicate_similarity": self.duplicate_similarity,
            "is_stock_photo": self.is_stock_photo,
            "fft_anomaly_score": self.fft_anomaly_score,
            "fft_flagged": self.fft_flagged,
            "weather_match": self.weather_match,
            "weather_conditions": self.weather_conditions,
            "weather_flagged": self.weather_flagged,
            "shadow_consistent": self.shadow_consistent,
            "sun_azimuth": self.sun_azimuth,
            "shadow_flagged": self.shadow_flagged
        })
        return res

    def pretty(self) -> str:
        lines = [
            "=" * 60,
            "  CivicTrust Image Verification Report",
            "=" * 60,
            f"  Overall Trust Score : {self.overall_trust_score:.4f}",
            f"  Suspicious           : {'YES ⚠' if self.is_suspicious else 'NO ✔'}",
            f"  Detected Category    : {self.detected_category}",
            "",
            "  ── EXIF ──────────────────────────────────────────",
            f"    Trust Score        : {self.exif.trust_score:.4f}",
            f"    GPS Coords         : {self.exif.gps_coords}",
            f"    Camera             : {self.exif.camera_make} {self.exif.camera_model}",
            f"    Timestamp          : {self.exif.image_timestamp}",
            f"    Recent (<30 days)  : {self.exif.timestamp_within_30_days}",
            "",
            "  ── ELA ───────────────────────────────────────────",
            f"    Manipulation Score : {self.ela.manipulation_score:.4f}",
            f"    Mean ELA Diff      : {self.ela.mean_diff:.2f}",
            f"    Max ELA Diff       : {self.ela.max_diff:.2f}",
            f"    High-Diff Ratio    : {self.ela.high_diff_ratio:.4f}",
            "",
            "  ── CLIP ──────────────────────────────────────────",
            f"    Match Score        : {self.clip.match_score:.4f}",
            f"    Detected Category  : {self.clip.detected_category}",
            "    All Category Scores:",
        ]
        for cat, score in sorted(self.clip.all_scores.items(),
                                 key=lambda x: x[1], reverse=True):
            lines.append(f"      {cat:<30} {score:.4f}")
        
        lines += [
            "",
            "  ── Location Cross-check ──────────────────────────",
            f"    GPS Location Match : {self.gps_location_match}",
            f"    Detected GPS City  : {self.detected_gps_city}",
            "",
            "  ── Duplicate Detection ───────────────────────────",
            f"    Is Duplicate       : {self.is_duplicate}",
            f"    Similarity Score   : {self.duplicate_similarity:.4f}",
            "",
            "  ── Reverse Image Search ──────────────────────────",
            f"    Is Stock Photo     : {self.is_stock_photo}",
            "",
            "  ── FFT Frequency Analysis ────────────────────────",
            f"    Anomaly Score      : {self.fft_anomaly_score:.4f}",
            f"    FFT Flagged        : {self.fft_flagged}",
            "",
            "  ── Weather Validation ────────────────────────────",
            f"    Weather Match      : {self.weather_match}",
            f"    Conditions         : {self.weather_conditions}",
            f"    Weather Flagged    : {self.weather_flagged}",
            "",
            "  ── Solar Azimuth Triangulation ───────────────────",
            f"    Shadow Consistent  : {self.shadow_consistent}",
            f"    Sun Azimuth        : {f'{self.sun_azimuth:.2f}' if self.sun_azimuth is not None else 'None'}",
            f"    Shadow Flagged     : {self.shadow_flagged}",
        ]

        lines += [
            "",
            "  ── Flags ─────────────────────────────────────────",
        ]
        if self.flags:
            for f in self.flags:
                lines.append(f"    ⚑ {f}")
        else:
            lines.append("    (none)")
        lines.append("=" * 60)
        return "\n".join(lines)


# ────────────────────────────────────────────────────────────────────────────
# Layer 1 – EXIF Checker
# ────────────────────────────────────────────────────────────────────────────

# Map numeric EXIF tag IDs to human-readable names
_TAG_MAP = {v: k for k, v in ExifTags.TAGS.items()}
_GPSINFO_TAGS = {v: k for k, v in ExifTags.GPSTAGS.items()}


def _dms_to_decimal(dms, ref: str) -> float:
    """Convert GPS degrees/minutes/seconds + hemisphere reference to decimal."""
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])
    decimal = degrees + minutes / 60.0 + seconds / 3600.0
    if ref in ("S", "W"):
        decimal = -decimal
    return decimal


def _parse_gps(gps_info: dict) -> Optional[Tuple[float, float]]:
    """Return (lat, lon) from a Pillow GPSInfo sub-dict, or None."""
    try:
        lat_dms = gps_info.get(2)   # GPSLatitude
        lat_ref = gps_info.get(1)   # GPSLatitudeRef
        lon_dms = gps_info.get(4)   # GPSLongitude
        lon_ref = gps_info.get(3)   # GPSLongitudeRef
        if lat_dms and lat_ref and lon_dms and lon_ref:
            lat = _dms_to_decimal(lat_dms, lat_ref)
            lon = _dms_to_decimal(lon_dms, lon_ref)
            return (round(lat, 6), round(lon, 6))
    except Exception:
        pass
    return None


def _parse_timestamp(ts_str: str) -> Optional[datetime]:
    """Parse EXIF datetime string (YYYY:MM:DD HH:MM:SS)."""
    try:
        return datetime.strptime(ts_str, "%Y:%m:%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )
    except Exception:
        return None


def check_exif(image_path: str) -> ExifResult:
    """
    Layer 1: Extract and evaluate EXIF metadata.

    Scoring (additive, max 1.0):
        +0.30  GPS coordinates present
        +0.25  Timestamp present
        +0.25  Timestamp within the last 30 days
        +0.20  Camera make/model present
    """
    flags: List[str] = []
    gps_coords: Optional[Tuple[float, float]] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    image_timestamp: Optional[str] = None

    has_gps = False
    has_timestamp = False
    timestamp_within_30_days = False
    has_camera_info = False

    try:
        img = Image.open(image_path)
        raw_exif = img._getexif()  # type: ignore[attr-defined]
    except Exception as exc:
        flags.append(f"EXIF read error: {exc}")
        return ExifResult(
            has_gps=False, has_timestamp=False,
            timestamp_within_30_days=False, has_camera_info=False,
            gps_coords=None, camera_make=None, camera_model=None,
            image_timestamp=None, trust_score=0.0,
            flags=flags,
        )

    if raw_exif is None:
        flags.append("No EXIF metadata found in image")
        return ExifResult(
            has_gps=False, has_timestamp=False,
            timestamp_within_30_days=False, has_camera_info=False,
            gps_coords=None, camera_make=None, camera_model=None,
            image_timestamp=None, trust_score=0.0,
            flags=flags,
        )

    decoded: dict = {}
    for tag_id, value in raw_exif.items():
        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
        decoded[tag_name] = value

    # GPS
    gps_raw = decoded.get("GPSInfo")
    if isinstance(gps_raw, dict):
        gps_coords = _parse_gps(gps_raw)
        has_gps = gps_coords is not None
    if not has_gps:
        flags.append("No GPS coordinates in EXIF")

    # Timestamp (prefer DateTimeOriginal > DateTime > DateTimeDigitized)
    for ts_key in ("DateTimeOriginal", "DateTime", "DateTimeDigitized"):
        if ts_key in decoded and decoded[ts_key]:
            image_timestamp = str(decoded[ts_key])
            has_timestamp = True
            break
    if not has_timestamp:
        flags.append("No timestamp found in EXIF")
    else:
        ts_dt = _parse_timestamp(image_timestamp)
        if ts_dt is not None:
            age = datetime.now(timezone.utc) - ts_dt
            if age <= timedelta(days=30):
                timestamp_within_30_days = True
            else:
                flags.append(
                    f"Image timestamp is {age.days} days old (>30-day limit)"
                )
        else:
            flags.append(f"Could not parse EXIF timestamp: {image_timestamp}")

    # Camera
    camera_make = decoded.get("Make") or None
    camera_model = decoded.get("Model") or None
    if camera_make:
        camera_make = camera_make.strip()
    if camera_model:
        camera_model = camera_model.strip()
    has_camera_info = bool(camera_make or camera_model)
    if not has_camera_info:
        flags.append("No camera make/model in EXIF")

    # Score
    score = 0.0
    if has_gps:
        score += 0.30
    if has_timestamp:
        score += 0.25
    if timestamp_within_30_days:
        score += 0.25
    if has_camera_info:
        score += 0.20

    return ExifResult(
        has_gps=has_gps,
        has_timestamp=has_timestamp,
        timestamp_within_30_days=timestamp_within_30_days,
        has_camera_info=has_camera_info,
        gps_coords=gps_coords,
        camera_make=camera_make,
        camera_model=camera_model,
        image_timestamp=image_timestamp,
        trust_score=round(score, 4),
        flags=flags,
    )


# ────────────────────────────────────────────────────────────────────────────
# Layer 2 – ELA (Error Level Analysis)
# ────────────────────────────────────────────────────────────────────────────

def run_ela(
    image_path: str,
    resave_quality: int = 90,
    anomaly_pixel_threshold: float = 15.0,
    manipulation_threshold: float = 0.12,
) -> ElaResult:
    """
    Layer 2: Error Level Analysis.

    Algorithm:
        1. Open the original image and convert to RGB.
        2. Re-save at ``resave_quality``% JPEG quality into a memory buffer.
        3. Re-open the re-saved version.
        4. Compute the absolute per-pixel difference (all channels averaged).
        5. Edited regions retain higher error; unedited regions converge to
           uniform low error after re-compression.

    Args:
        image_path:             Path to the source image.
        resave_quality:         JPEG quality for the comparison re-save (default 90).
        anomaly_pixel_threshold: Per-pixel mean-channel diff above which a pixel
                                  is counted as anomalous (default 15.0 / 255).
        manipulation_threshold:  high_diff_ratio above this value sets the
                                  manipulation flag (default 0.12 = 12 %).

    Returns:
        ElaResult with manipulation_score in [0, 1].
    """
    import cv2

    flags: List[str] = []

    try:
        original = Image.open(image_path).convert("RGB")
    except Exception as exc:
        return ElaResult(
            manipulation_score=0.5, mean_diff=0.0, max_diff=0.0,
            high_diff_ratio=0.0,
            flags=[f"ELA: could not open image – {exc}"],
        )

    # Re-save at reduced quality
    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=resave_quality)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")

    orig_np = np.array(original, dtype=np.float32)
    recomp_np = np.array(recompressed, dtype=np.float32)

    # Per-pixel absolute difference, averaged across RGB channels
    diff = np.abs(orig_np - recomp_np).mean(axis=2)   # (H, W)

    mean_diff = float(diff.mean())
    max_diff  = float(diff.max())
    total_pixels = diff.size
    high_diff_pixels = int((diff > anomaly_pixel_threshold).sum())
    high_diff_ratio = high_diff_pixels / total_pixels

    # Normalise manipulation_score to [0, 1]:
    # We map the high_diff_ratio through a gentle sigmoid-like curve so
    # that small ratios still produce informative scores.
    manipulation_score = min(1.0, high_diff_ratio / manipulation_threshold)

    if high_diff_ratio > manipulation_threshold:
        flags.append(
            f"ELA: high anomaly ratio {high_diff_ratio:.2%} "
            f"(threshold {manipulation_threshold:.0%}) – potential editing detected"
        )
    if mean_diff > 20.0:
        flags.append(
            f"ELA: elevated mean pixel diff {mean_diff:.1f} "
            "– image may have been re-saved multiple times"
        )

    return ElaResult(
        manipulation_score=round(manipulation_score, 4),
        mean_diff=round(mean_diff, 4),
        max_diff=round(max_diff, 4),
        high_diff_ratio=round(high_diff_ratio, 6),
        flags=flags,
    )


# ────────────────────────────────────────────────────────────────────────────
# Layer 3 – CLIP Similarity
# ────────────────────────────────────────────────────────────────────────────

# Textual descriptions for each civic issue category.
# Multiple phrasings per category improve recall.
CIVIC_CATEGORIES: Dict[str, List[str]] = {
    "pothole": [
        "a pothole on a road",
        "damaged road with holes",
        "road with deep pits",
        "broken asphalt with holes",
        "road damage with craters",
    ],
    "waterlogged road": [
        "waterlogged road",
        "road with water pooling",
        "flooded street",
        "standing water on road",
        "road flooded with rainwater",
    ],
    "garbage": [
        "garbage dumped on street",
        "waste pile on road",
        "trash heap in public area",
        "garbage dump near housing",
        "uncollected waste on street",
    ],
    "drainage": [
        "blocked drainage",
        "overflowing drain",
        "clogged stormwater drain",
        "sewage overflow on street",
        "broken drainage pipe",
    ],
    "streetlight": [
        "broken streetlight",
        "damaged street lamp",
        "non functioning road light",
        "dark street with broken lights",
        "fallen electricity pole",
    ],
    "water supply": [
        "broken water pipe on street",
        "water leaking from pipe",
        "burst water main",
        "water supply pipe damage",
        "municipal water pipe leaking",
    ],
    "illegal construction": [
        "illegal construction on footpath",
        "unauthorized building on road",
        "encroachment on public land",
        "illegal structure blocking road",
        "unauthorized construction near road",
    ],
}

# Flat negative prompts used to detect non-civic (invalid) images
_NEGATIVE_PROMPTS = [
    "a selfie of a person",
    "food on a plate",
    "indoor room photo",
    "nature landscape",
    "animal photo",
    "blank white image",
]

_clip_model = None   # lazy-loaded singleton


def _load_clip():
    """Lazy-load the CLIP model and processor on first use."""
    global _clip_model
    if _clip_model is not None:
        return _clip_model

    from transformers import CLIPProcessor, CLIPModel
    import torch

    model_id = "openai/clip-vit-base-patch32"
    print(f"[image_verifier] Loading CLIP model '{model_id}' …", flush=True)
    processor = CLIPProcessor.from_pretrained(model_id)
    model = CLIPModel.from_pretrained(model_id)
    model.eval()
    _clip_model = (model, processor)
    print("[image_verifier] CLIP model ready.", flush=True)
    return _clip_model


def run_clip(
    image_path: str,
    category_threshold: float = 0.22,
) -> ClipResult:
    """
    Layer 3: CLIP-based civic category matching.

    Computes cosine similarity between the image embedding and a set of
    text prompts for each civic issue category. The category with the highest
    mean similarity is returned as the detected category.

    Args:
        image_path:          Path to the source image.
        category_threshold:  Minimum similarity score to count as a valid
                              civic image (default 0.22).

    Returns:
        ClipResult with match_score in [0, 1] and detected_category string.
    """
    import torch

    flags: List[str] = []
    model, processor = _load_clip()

    try:
        image = Image.open(image_path).convert("RGB")
    except Exception as exc:
        return ClipResult(
            detected_category="unknown",
            match_score=0.0,
            all_scores={},
            flags=[f"CLIP: could not open image – {exc}"],
        )

    # Build per-category average similarity
    all_scores: Dict[str, float] = {}

    for category, prompts in CIVIC_CATEGORIES.items():
        inputs = processor(
            text=prompts,
            images=[image] * len(prompts),
            return_tensors="pt",
            padding=True,
        )
        with torch.no_grad():
            outputs = model(**inputs)
        # logits_per_image: (num_images, num_texts) – take diagonal
        # Since we paired each prompt with the same image, the diagonal
        # gives image↔text similarity for each prompt.
        probs = outputs.logits_per_image.softmax(dim=1)   # (len_prompts, len_prompts)
        # Use raw cosine similarity instead for a stable 0-1 score
        image_emb = outputs.image_embeds          # (len_prompts, dim)
        text_emb  = outputs.text_embeds           # (len_prompts, dim)
        cos_sim = torch.nn.functional.cosine_similarity(
            image_emb, text_emb, dim=1
        )
        all_scores[category] = float(cos_sim.mean().item())

    # Detect non-civic images via negative prompts
    neg_inputs = processor(
        text=_NEGATIVE_PROMPTS,
        images=[image] * len(_NEGATIVE_PROMPTS),
        return_tensors="pt",
        padding=True,
    )
    with torch.no_grad():
        neg_outputs = model(**neg_inputs)
    neg_emb = neg_outputs.image_embeds
    neg_text = neg_outputs.text_embeds
    neg_sims = torch.nn.functional.cosine_similarity(neg_emb, neg_text, dim=1)
    neg_score = float(neg_sims.max().item())

    # Best category
    detected_category = max(all_scores, key=all_scores.__getitem__)
    match_score = all_scores[detected_category]

    if match_score < category_threshold:
        flags.append(
            f"CLIP: best category '{detected_category}' scored {match_score:.4f} "
            f"(below threshold {category_threshold}) – image may not show a civic issue"
        )
    if neg_score > match_score:
        flags.append(
            f"CLIP: image matches a non-civic subject (neg_score={neg_score:.4f}) "
            "more than any civic category"
        )

    return ClipResult(
        detected_category=detected_category,
        match_score=round(match_score, 4),
        all_scores={k: round(v, 4) for k, v in all_scores.items()},
        flags=flags,
    )


# ────────────────────────────────────────────────────────────────────────────
# Layer 4 – GPS vs Address Cross-check
# ────────────────────────────────────────────────────────────────────────────

def check_gps_location_match(
    gps_coords: Optional[Tuple[float, float]],
    complaint_address: Optional[str],
) -> Tuple[bool, Optional[str], List[str]]:
    """
    Layer 4: GPS vs Address Cross-check using geopy (Nominatim).
    """
    flags = []
    gps_location_match = True
    detected_gps_city = None

    if not gps_coords or not complaint_address:
        return gps_location_match, detected_gps_city, flags

    try:
        from geopy.geocoders import Nominatim
        # Use a descriptive user_agent as required by Nominatim
        geolocator = Nominatim(user_agent="civictrust_image_verifier")
        location = geolocator.reverse(gps_coords, timeout=10)
        if location and 'address' in location.raw:
            addr = location.raw['address']
            detected_gps_city = (
                addr.get('city') or 
                addr.get('town') or 
                addr.get('village') or 
                addr.get('suburb') or 
                addr.get('county') or 
                addr.get('state')
            )
            if detected_gps_city:
                # Compare case-insensitively. Since complaint_address might contain 
                # additional text, we check if the city/state name exists within it.
                if detected_gps_city.lower() not in complaint_address.lower():
                    gps_location_match = False
                    flags.append("Location mismatch detected")
    except Exception as e:
        print(f"[image_verifier] geopy error: {e}")
        pass

    return gps_location_match, detected_gps_city, flags


# ────────────────────────────────────────────────────────────────────────────
# Layer 5 – Duplicate Photo Detection
# ────────────────────────────────────────────────────────────────────────────

def check_duplicate_photo(
    image_path: str,
    hashes_db_path: str = r"E:\file\ai\civictrust-ml\photo_hashes.json",
) -> Tuple[bool, float, List[str]]:
    """
    Layer 5: Duplicate Photo Detection using perceptual hashing (pHash).
    """
    import imagehash
    flags = []
    is_duplicate = False
    duplicate_similarity = 0.0

    try:
        img = Image.open(image_path)
        current_hash = imagehash.phash(img)
    except Exception as e:
        print(f"[image_verifier] imagehash error: {e}")
        return is_duplicate, duplicate_similarity, flags

    # Load existing hashes
    hashes_list = []
    if os.path.exists(hashes_db_path):
        try:
            with open(hashes_db_path, 'r') as f:
                hashes_list = json.load(f)
                if not isinstance(hashes_list, list):
                    hashes_list = []
        except Exception as e:
            print(f"[image_verifier] Error loading {hashes_db_path}: {e}")

    min_distance = 64  # Max distance for 64-bit hash is 64

    for stored_hash_str in hashes_list:
        try:
            stored_hash = imagehash.hex_to_hash(stored_hash_str)
            distance = current_hash - stored_hash
            if distance < min_distance:
                min_distance = distance
        except Exception as e:
            print(f"[image_verifier] Error parsing stored hash {stored_hash_str}: {e}")

    if hashes_list:
        duplicate_similarity = 1.0 - (min_distance / 64.0)
        if min_distance < 10:
            is_duplicate = True
            flags.append("Duplicate photo detected")
    else:
        duplicate_similarity = 0.0

    # If unique, save the new hash
    if not is_duplicate:
        hashes_list.append(str(current_hash))
        try:
            os.makedirs(os.path.dirname(hashes_db_path), exist_ok=True)
            with open(hashes_db_path, 'w') as f:
                json.dump(hashes_list, f, indent=2)
        except Exception as e:
            print(f"[image_verifier] Error saving new hash: {e}")

    return is_duplicate, duplicate_similarity, flags


# ────────────────────────────────────────────────────────────────────────────
# Layer 6 – Reverse Image Search
# ────────────────────────────────────────────────────────────────────────────

def check_reverse_image(
    image_path: str,
    stock_db_path: str = r"E:\file\ai\civictrust-ml\stock_hashes.json",
) -> Tuple[bool, List[str]]:
    """
    Layer 6: Reverse Image Search.
    Compute a perceptual hash of the uploaded image.
    Search Google Images using requests and check if the image appears to be a stock/internet photo.
    As a fallback, check if the image hash matches any hash in a known stock photo database file.
    """
    import requests
    import imagehash
    flags = []
    is_stock_photo = False

    try:
        img = Image.open(image_path)
        current_hash = imagehash.phash(img)
    except Exception as e:
        print(f"[image_verifier] Error computing phash for stock check: {e}")
        return False, []

    # 1. Search Google Images
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        url = "https://www.google.com/searchbyimage/upload"
        with open(image_path, 'rb') as f:
            files = {'encoded_image': f}
            response = requests.post(url, files=files, headers=headers, timeout=10)
        
        text = response.text.lower()
        stock_keywords = [
            "shutterstock", "gettyimages", "istockphoto", "alamy", 
            "stock photo", "stock photography", "stock vector", 
            "depositphotos", "dreamstime"
        ]
        if any(kw in text for kw in stock_keywords):
            is_stock_photo = True
    except Exception as e:
        print(f"[image_verifier] Google reverse image search failed/blocked: {e}")

    # 2. Fallback check: stock_hashes.json
    if not is_stock_photo:
        stock_list = []
        if os.path.exists(stock_db_path):
            try:
                with open(stock_db_path, 'r') as f:
                    stock_list = json.load(f)
                    if not isinstance(stock_list, list):
                        stock_list = []
            except Exception as e:
                print(f"[image_verifier] Error loading stock database {stock_db_path}: {e}")

        for stored_hash_str in stock_list:
            try:
                stored_hash = imagehash.hex_to_hash(stored_hash_str)
                distance = current_hash - stored_hash
                if distance < 10:
                    is_stock_photo = True
                    break
            except Exception as e:
                print(f"[image_verifier] Error parsing stock hash {stored_hash_str}: {e}")

    if is_stock_photo:
        flags.append("Possible stock photo detected")

    return is_stock_photo, flags


# ────────────────────────────────────────────────────────────────────────────
# Layer 7 – FFT Frequency Analysis
# ────────────────────────────────────────────────────────────────────────────

def check_fft_anomaly(image_path: str) -> Tuple[float, bool, List[str]]:
    """
    Layer 7: FFT Frequency Analysis.
    Convert the image to grayscale, apply 2D FFT, shift zero-frequency to center,
    compute magnitude spectrum, and analyze uniformity and grid spikes.
    """
    import cv2
    import numpy as np

    flags = []
    fft_anomaly_score = 0.0
    fft_flagged = False

    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0, False, ["FFT: could not load image"]

        f = np.fft.fft2(img)
        fshift = np.fft.fftshift(f)
        magnitude = np.abs(fshift)

        H, W = magnitude.shape
        cy, cx = H // 2, W // 2
        y, x = np.ogrid[:H, :W]
        dist = np.sqrt((x - cx)**2 + (y - cy)**2)
        max_dist = np.max(dist)

        low_mask = dist <= 0.05 * max_dist
        high_mask = dist > 0.4 * max_dist

        mean_low = np.mean(magnitude[low_mask])
        mean_high = np.mean(magnitude[high_mask])

        ratio = mean_high / (mean_low + 1e-8)
        peak_factor = np.max(magnitude[high_mask]) / (mean_high + 1e-8)

        # Anomaly score metrics
        score_uniformity = min(1.0, ratio / 0.02)
        score_grid = min(1.0, max(0.0, (peak_factor - 50.0) / 150.0))

        fft_anomaly_score = float(max(score_uniformity, score_grid))
        fft_anomaly_score = float(np.clip(fft_anomaly_score, 0.0, 1.0))

        if fft_anomaly_score > 0.7:
            fft_flagged = True
            flags.append("Frequency anomaly detected — possible AI-generated image")

    except Exception as e:
        print(f"[image_verifier] FFT error: {e}")
        flags.append(f"FFT check error: {e}")

    return round(fft_anomaly_score, 4), fft_flagged, flags


# ────────────────────────────────────────────────────────────────────────────
# Layer 8 – Weather Validation
# ────────────────────────────────────────────────────────────────────────────

def check_weather_validation(
    image_path: str,
    gps_coords: Optional[Tuple[float, float]],
    image_timestamp: Optional[str],
) -> Tuple[bool, Optional[str], bool, List[str]]:
    """
    Layer 8: Weather Validation.
    Calls Open-Meteo Historical Weather API and checks visible weather via CLIP.
    """
    import requests
    import numpy as np

    flags = []
    weather_match = True
    weather_conditions = None
    weather_flagged = False

    if not gps_coords or not image_timestamp:
        return weather_match, weather_conditions, weather_flagged, flags

    # 1. Parse date and hour
    try:
        parts = image_timestamp.strip().split(' ')
        date_str = parts[0].replace(':', '-')
        hour = int(parts[1].split(':')[0])
    except Exception as e:
        print(f"[image_verifier] Weather timestamp parse failed: {e}")
        return weather_match, weather_conditions, weather_flagged, flags

    # 2. Call Open-Meteo API
    meteo_weather = "unknown"
    try:
        url = (
            f"https://archive-api.open-meteo.com/v1/archive?"
            f"latitude={gps_coords[0]}&longitude={gps_coords[1]}&"
            f"start_date={date_str}&end_date={date_str}&"
            f"hourly=weathercode,precipitation,cloudcover"
        )
        print(f"[image_verifier] Querying Weather API: {url}")
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            hourly = data.get("hourly", {})
            codes = hourly.get("weathercode", [])
            precips = hourly.get("precipitation", [])
            clouds = hourly.get("cloudcover", [])

            if len(codes) > hour:
                weathercode = codes[hour]
                precipitation = precips[hour]
                cloudcover = clouds[hour]

                is_rainy_api = (weathercode >= 50) or (precipitation > 0.1)
                is_cloudy_api = (weathercode in (2, 3, 45, 48)) or (cloudcover >= 60)
                is_sunny_api = (weathercode <= 1) and (cloudcover < 30)

                if is_rainy_api:
                    meteo_weather = "rainy"
                    weather_conditions = "Rainy/Overcast"
                elif is_cloudy_api:
                    meteo_weather = "cloudy"
                    weather_conditions = "Cloudy/Overcast"
                elif is_sunny_api:
                    meteo_weather = "sunny"
                    weather_conditions = "Sunny/Clear"
                else:
                    meteo_weather = "mixed"
                    weather_conditions = f"Mixed (Code {weathercode})"
            else:
                print(f"[image_verifier] Open-Meteo index out of bounds: hour {hour} in list size {len(codes)}")
        else:
            print(f"[image_verifier] Weather API returned status {response.status_code}")
    except Exception as e:
        print(f"[image_verifier] Weather API request failed: {e}")

    # 3. Visible weather via CLIP
    visible_weather = "unknown"
    if meteo_weather != "unknown":
        try:
            model, processor = _load_clip()
            from PIL import Image
            import torch

            image = Image.open(image_path).convert("RGB")
            weather_prompts = [
                "a photo taken in bright sunny weather with strong sunlight",
                "a photo showing rain falling or wet flooded streets",
                "a photo taken on a cloudy overcast gloomy day"
            ]

            inputs = processor(
                text=weather_prompts,
                images=[image] * len(weather_prompts),
                return_tensors="pt",
                padding=True,
            )
            with torch.no_grad():
                outputs = model(**inputs)

            image_emb = outputs.image_embeds
            text_emb = outputs.text_embeds
            cos_sims = torch.nn.functional.cosine_similarity(image_emb, text_emb, dim=1)
            sims_list = cos_sims.tolist()

            weather_classes = ["sunny", "rainy", "cloudy"]
            visible_idx = int(np.argmax(sims_list))
            visible_weather = weather_classes[visible_idx]
            print(f"[image_verifier] Visible weather (CLIP): {visible_weather} (scores: {sims_list})")
        except Exception as e:
            print(f"[image_verifier] Weather CLIP classification failed: {e}")

    # 4. Cross-reference
    if visible_weather == "rainy" and meteo_weather == "sunny":
        weather_match = False
        weather_flagged = True
        flags.append("Weather mismatch: image shows rain/flooding but weather was reported sunny")
    elif visible_weather == "sunny" and meteo_weather == "cloudy":
        weather_match = False
        weather_flagged = True
        flags.append("Weather mismatch: image shows bright sunlight but weather was reported cloudy")

    return weather_match, weather_conditions, weather_flagged, flags


# ────────────────────────────────────────────────────────────────────────────
# Layer 9 – Solar Azimuth Triangulation
# ────────────────────────────────────────────────────────────────────────────

def check_shadow_triangulation(
    image_path: str,
    gps_coords: Optional[Tuple[float, float]],
    image_timestamp: Optional[str],
) -> Tuple[bool, Optional[float], bool, List[str]]:
    """
    Layer 9: Solar Azimuth Triangulation.
    Calculates sun azimuth using pysolar and compares it with dominant shadow angles.
    """
    import cv2
    import numpy as np
    from datetime import datetime, timezone

    flags = []
    shadow_consistent = True
    sun_az = None
    shadow_flagged = False

    if not gps_coords or not image_timestamp:
        return shadow_consistent, sun_az, shadow_flagged, flags

    # 1. Calculate Sun Azimuth
    try:
        from pysolar.solar import get_azimuth
        dt = datetime.strptime(image_timestamp.strip(), "%Y:%m:%d %H:%M:%S").replace(tzinfo=timezone.utc)
        sun_az = float(get_azimuth(gps_coords[0], gps_coords[1], dt))
    except Exception as e:
        print(f"[image_verifier] pysolar error: {e}")
        return shadow_consistent, sun_az, shadow_flagged, flags

    # 2. Analyze Image Shadow Orientation
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return shadow_consistent, sun_az, shadow_flagged, flags

        # Edge detection
        edges = cv2.Canny(img, 50, 150, apertureSize=3)
        # Hough Line Transform
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)

        if lines is not None and len(lines) > 0:
            angles = []
            for line in lines:
                rho, theta = line[0]
                angle = (np.rad2deg(theta) - 90) % 180
                angles.append(angle)

            # Find dominant direction using histogram
            hist, bin_edges = np.histogram(angles, bins=18, range=(0, 180))
            max_bin = np.argmax(hist)
            dominant_angle = float((bin_edges[max_bin] + bin_edges[max_bin+1]) / 2.0)

            # 3. Compare detected angle with expected angle (sun_az modulo 180)
            expected_angle = sun_az % 180
            diff = abs(dominant_angle - expected_angle)
            diff = diff % 180
            if diff > 90:
                diff = 180 - diff

            if diff > 45:
                shadow_consistent = False
                shadow_flagged = True
                flags.append("Shadow direction inconsistent with sun position")
    except Exception as e:
        print(f"[image_verifier] Shadow triangulation error: {e}")

    return shadow_consistent, sun_az, shadow_flagged, flags


# ────────────────────────────────────────────────────────────────────────────
# Combined verifier
# ────────────────────────────────────────────────────────────────────────────

def verify_image(
    image_path: str,
    ela_threshold: float = 0.12,
    clip_threshold: float = 0.22,
    # Weights for the combined score (must sum to 1.0)
    exif_weight: float = 0.20,
    ela_weight: float = 0.18,
    clip_weight: float = 0.17,
    fft_weight: float = 0.17,
    weather_weight: float = 0.13,
    shadow_weight: float = 0.15,
    suspicious_threshold: float = 0.45,
    complaint_address: Optional[str] = None,
) -> VerificationResult:
    """
    Run all nine verification layers and combine into a single result.

    Combined trust score formula (retains the core layers + FFT + Weather + Shadow)
    -----------------------------------------------------------------------------
        exif_contrib     = exif.trust_score          × exif_weight
        ela_contrib      = (1 - ela.manipulation_score) × ela_weight
        clip_contrib     = clip.match_score           × clip_weight
        fft_contrib      = (1 - fft_anomaly_score)    × fft_weight
        weather_contrib  = (0 if weather_flagged else 1) × weather_weight
        shadow_contrib   = (0 if shadow_flagged else 1)  × shadow_weight
        overall          = exif_contrib + ela_contrib + clip_contrib + fft_contrib + weather_contrib + shadow_contrib

    An image is marked suspicious when overall_trust_score < suspicious_threshold.

    Args:
        image_path:           Path to the image file to verify.
        ela_threshold:        ELA high-diff-ratio threshold (→ ElaResult).
        clip_threshold:       Minimum CLIP similarity for a valid civic match.
        exif_weight:          Weight of the EXIF trust score (default 0.20).
        ela_weight:           Weight of the ELA score (default 0.18).
        clip_weight:          Weight of the CLIP score (default 0.17).
        fft_weight:           Weight of the FFT score (default 0.17).
        weather_weight:       Weight of the Weather score (default 0.13).
        shadow_weight:        Weight of the Shadow score (default 0.15).
        suspicious_threshold: Images below this overall score are flagged
                               (default 0.45).
        complaint_address:    Optional address string to check against GPS EXIF city.

    Returns:
        A fully populated VerificationResult.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    print(f"[image_verifier] Verifying: {image_path}")
    print("[image_verifier] Running Layer 1 – EXIF …")
    exif = check_exif(image_path)

    print("[image_verifier] Running Layer 2 – ELA …")
    ela = run_ela(image_path, manipulation_threshold=ela_threshold)

    print("[image_verifier] Running Layer 3 – CLIP …")
    clip = run_clip(image_path, category_threshold=clip_threshold)

    # Run Layer 4 – GPS vs Address Cross-check
    print("[image_verifier] Running Layer 4 – GPS Cross-check …")
    gps_location_match, detected_gps_city, gps_flags = check_gps_location_match(
        exif.gps_coords, complaint_address
    )

    # Run Layer 5 – Duplicate Photo Detection
    print("[image_verifier] Running Layer 5 – Duplicate Detection …")
    is_duplicate, duplicate_similarity, duplicate_flags = check_duplicate_photo(
        image_path
    )

    # Run Layer 6 – Reverse Image Search
    print("[image_verifier] Running Layer 6 – Reverse Image Search …")
    is_stock_photo, stock_flags = check_reverse_image(image_path)

    # Run Layer 7 – FFT Frequency Analysis
    print("[image_verifier] Running Layer 7 – FFT Frequency Analysis …")
    fft_anomaly_score, fft_flagged, fft_flags = check_fft_anomaly(image_path)

    # Run Layer 8 – Weather Validation
    print("[image_verifier] Running Layer 8 – Weather Validation …")
    weather_match, weather_conditions, weather_flagged, weather_flags = check_weather_validation(
        image_path, exif.gps_coords, exif.image_timestamp
    )

    # Run Layer 9 – Solar Azimuth Triangulation
    print("[image_verifier] Running Layer 9 – Solar Azimuth Triangulation …")
    shadow_consistent, sun_azimuth, shadow_flagged, shadow_flags = check_shadow_triangulation(
        image_path, exif.gps_coords, exif.image_timestamp
    )

    # Combined score
    exif_contrib = exif.trust_score * exif_weight
    ela_contrib  = (1.0 - ela.manipulation_score) * ela_weight
    clip_contrib = clip.match_score * clip_weight
    fft_contrib  = (1.0 - fft_anomaly_score) * fft_weight
    weather_score = 0.0 if weather_flagged else 1.0
    weather_contrib = weather_score * weather_weight
    shadow_score = 0.0 if shadow_flagged else 1.0
    shadow_contrib = shadow_score * shadow_weight
    overall = round(exif_contrib + ela_contrib + clip_contrib + fft_contrib + weather_contrib + shadow_contrib, 4)

    all_flags = exif.flags + ela.flags + clip.flags + gps_flags + duplicate_flags + stock_flags + fft_flags + weather_flags + shadow_flags
    is_suspicious = overall < suspicious_threshold

    return VerificationResult(
        overall_trust_score=overall,
        is_suspicious=is_suspicious,
        flags=all_flags,
        detected_category=clip.detected_category,
        exif=exif,
        ela=ela,
        clip=clip,
        gps_location_match=gps_location_match,
        detected_gps_city=detected_gps_city,
        is_duplicate=is_duplicate,
        duplicate_similarity=round(duplicate_similarity, 4),
        is_stock_photo=is_stock_photo,
        fft_anomaly_score=fft_anomaly_score,
        fft_flagged=fft_flagged,
        weather_match=weather_match,
        weather_conditions=weather_conditions,
        weather_flagged=weather_flagged,
        shadow_consistent=shadow_consistent,
        sun_azimuth=sun_azimuth,
        shadow_flagged=shadow_flagged,
    )


# ────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ────────────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="image_verifier",
        description=(
            "CivicTrust image verifier – three-layer EXIF / ELA / CLIP pipeline."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument(
        "--image", required=True,
        help="Path to the civic complaint image to verify.",
    )
    p.add_argument(
        "--complaint-address", default=None,
        help="Optional address string to cross-check against image GPS data.",
    )
    p.add_argument(
        "--ela-threshold", type=float, default=0.12,
        help="ELA high-diff-ratio threshold for manipulation flag (0–1).",
    )
    p.add_argument(
        "--clip-threshold", type=float, default=0.22,
        help="Minimum CLIP cosine similarity for a valid civic category match.",
    )
    p.add_argument(
        "--suspicious-threshold", type=float, default=0.45,
        help="Overall trust score below which the image is flagged suspicious.",
    )
    p.add_argument(
        "--json", action="store_true",
        help="Output the full result as JSON instead of a human-readable report.",
    )
    p.add_argument(
        "--exif-only", action="store_true",
        help="Run only the EXIF layer (fast, no model downloads).",
    )
    p.add_argument(
        "--ela-only", action="store_true",
        help="Run only the ELA layer (fast, no model downloads).",
    )
    return p


def main():
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    parser = _build_parser()
    args = parser.parse_args()

    # Partial modes ─────────────────────────────────────────────────────────
    if args.exif_only:
        result = check_exif(args.image)
        print(json.dumps(asdict(result), indent=2, default=str))
        return

    if args.ela_only:
        result = run_ela(args.image, manipulation_threshold=args.ela_threshold)
        print(json.dumps(asdict(result), indent=2, default=str))
        return

    # Full pipeline ─────────────────────────────────────────────────────────
    result = verify_image(
        image_path=args.image,
        ela_threshold=args.ela_threshold,
        clip_threshold=args.clip_threshold,
        suspicious_threshold=args.suspicious_threshold,
        complaint_address=args.complaint_address,
    )

    if args.json:
        print(json.dumps(result.to_dict(), indent=2, default=str))
    else:
        print(result.pretty())


if __name__ == "__main__":
    main()
