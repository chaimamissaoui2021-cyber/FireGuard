
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from pathlib import Path
from PIL import Image, UnidentifiedImageError
from io import BytesIO
import threading

# ==========================================
# FIREGUARD - FASTAPI BACKEND
# ==========================================

app = FastAPI(
    title="FireGuard API",
    description="AI Fire, Smoke and Person Detection",
    version="1.0.0"
)

# ==========================================
# CORS - REACT FRONTEND
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# MODEL PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

FIRE_MODEL_PATH = MODELS_DIR / "best.pt"
PERSON_MODEL_PATH = MODELS_DIR / "yolo11n.pt"

# ==========================================
# CONFIDENCE THRESHOLDS
# ==========================================

FIRE_CONF = 0.30
SMOKE_CONF = 0.40
PERSON_CONF = 0.25

MAX_FILE_SIZE = 10 * 1024 * 1024

# Avoid simultaneous inference on shared models
inference_lock = threading.Lock()

# ==========================================
# LOAD YOLO MODELS
# ==========================================

if not FIRE_MODEL_PATH.is_file():
    raise RuntimeError(
        f"Fire model not found: {FIRE_MODEL_PATH}"
    )

if not PERSON_MODEL_PATH.is_file():
    raise RuntimeError(
        f"Person model not found: {PERSON_MODEL_PATH}"
    )

print("Loading FireGuard AI models...")

fire_model = YOLO(str(FIRE_MODEL_PATH))
person_model = YOLO(str(PERSON_MODEL_PATH))

print("Fire model classes:", fire_model.names)
print("Person model loaded successfully.")

# Validate expected class names
fire_classes = {
    str(name).lower().strip()
    for name in fire_model.names.values()
}

if "fire" not in fire_classes or "smoke" not in fire_classes:
    print(
        "WARNING: Fire model classes do not include "
        "both 'fire' and 'smoke'. Check training labels."
    )

# ==========================================
# HOME ENDPOINT
# ==========================================

@app.get("/")
def home():
    return {
        "message": "FireGuard API is running",
        "status": "online",
        "models": {
            "fire_smoke": FIRE_MODEL_PATH.name,
            "people": PERSON_MODEL_PATH.name
        }
    }


# ==========================================
# MODEL INFORMATION
# ==========================================

@app.get("/model-info")
def model_info():
    return {
        "fire_model": str(FIRE_MODEL_PATH),
        "fire_classes": fire_model.names,
        "person_model": str(PERSON_MODEL_PATH),
        "thresholds": {
            "fire": FIRE_CONF,
            "smoke": SMOKE_CONF,
            "person": PERSON_CONF
        }
    }


# ==========================================
# IMAGE ANALYSIS
# ==========================================

@app.post("/analyze")
def analyze_image(file: UploadFile = File(...)):

    # Check file format
    if file.content_type not in [
        "image/jpeg",
        "image/png"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Only JPG and PNG images are accepted"
        )

    # Read image
    image_bytes = file.file.read(
        MAX_FILE_SIZE + 1
    )

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Image is empty"
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB"
        )

    # Decode image
    try:
        image = Image.open(
            BytesIO(image_bytes)
        ).convert("RGB")

    except (
        UnidentifiedImageError,
        OSError,
        ValueError
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    try:
        with inference_lock:

            # ==================================
            # 1. PERSON DETECTION
            # ==================================

            person_results = person_model.predict(
                source=image,
                conf=PERSON_CONF,
                classes=[0],
                imgsz=640,
                verbose=False
            )

            persons = 0

            for result in person_results:
                persons += len(result.boxes)

            # ==================================
            # 2. FIRE AND SMOKE DETECTION
            # ==================================

            fire_results = fire_model.predict(
                source=image,
                conf=min(FIRE_CONF, SMOKE_CONF),
                imgsz=640,
                verbose=False
            )

            fire_detected = False
            smoke_detected = False

            detections = []

            for result in fire_results:

                for box in result.boxes:

                    class_id = int(
                        box.cls[0].item()
                    )

                    class_name = str(
                        result.names[class_id]
                    ).lower().strip()

                    confidence = float(
                        box.conf[0].item()
                    )

                    if (
                        class_name == "fire"
                        and confidence >= FIRE_CONF
                    ):
                        fire_detected = True

                        detections.append({
                            "type": "fire",
                            "confidence": round(
                                confidence, 3
                            )
                        })

                    elif (
                        class_name == "smoke"
                        and confidence >= SMOKE_CONF
                    ):
                        smoke_detected = True

                        detections.append({
                            "type": "smoke",
                            "confidence": round(
                                confidence, 3
                            )
                        })

            # ==================================
            # 3. DEMO PRIORITY RULES
            # ==================================

            if fire_detected and persons >= 3:
                priority = "CRITIQUE"

            elif fire_detected and persons >= 1:
                priority = "ELEVEE"

            elif fire_detected:
                priority = "MOYENNE"

            elif smoke_detected:
                priority = "ATTENTION"

            else:
                priority = "FAIBLE"

            # ==================================
            # 4. RESPONSE TO REACT
            # ==================================

            return {
                "fire_detected": fire_detected,
                "smoke_detected": smoke_detected,
                "persons": persons,
                "priority": priority,
                "detections": detections
            }

    except HTTPException:
        raise

    except Exception as exc:
        print("FireGuard analysis error:", exc)

        raise HTTPException(
            status_code=500,
            detail="Image analysis failed"
        )
