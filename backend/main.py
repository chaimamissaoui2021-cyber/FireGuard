
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from pathlib import Path
import tempfile
import os

app = FastAPI(title="FireGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent

# Modèles YOLO
person_model = YOLO(str(BASE_DIR / "yolo11n.pt"))

fire_model = YOLO(str(
    BASE_DIR / "runs/detect/runs/fireguard/fire_final/weights/best.pt"
))

# Seuils ajustables
PERSON_CONF = 0.25
FIRE_CONF = 0.30
SMOKE_CONF = 0.40

@app.get("/")
def home():
    return {"message": "FireGuard API is running"}


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):

    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPG and PNG images are accepted"
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Image is empty"
        )

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB"
        )

    suffix = ".png" if file.content_type == "image/png" else ".jpg"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp:
            temp.write(image_bytes)
            temp_path = temp.name

        # 1. Détection des personnes
        person_results = person_model(
            temp_path,
            conf=PERSON_CONF,
            classes=[0],
            imgsz=640,
            verbose=False
        )

        persons = sum(
            len(result.boxes)
            for result in person_results
        )

        # 2. Détection feu / fumée
        fire_results = fire_model(
            temp_path,
            conf=min(FIRE_CONF, SMOKE_CONF),
            imgsz=640,
            verbose=False
        )

        fire_detected = False
        smoke_detected = False

        detections = []

        for result in fire_results:
            for box in result.boxes:
                class_name = result.names[
                    int(box.cls[0])
                ].lower().strip()

                confidence = float(box.conf[0])

                if class_name == "fire":
                    if confidence >= FIRE_CONF:
                        fire_detected = True
                        detections.append({
                            "type": "fire",
                            "confidence": round(confidence, 3)
                        })

                elif class_name == "smoke":
                    if confidence >= SMOKE_CONF:
                        smoke_detected = True
                        detections.append({
                            "type": "smoke",
                            "confidence": round(confidence, 3)
                        })

        # 3. Priorité (règles de démonstration)
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
        print("Analysis error:", exc)
        raise HTTPException(
            status_code=500,
            detail="Image analysis failed"
        )
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
