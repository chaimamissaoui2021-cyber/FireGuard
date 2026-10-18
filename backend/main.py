
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from pathlib import Path
import tempfile
import os

app = FastAPI(title="FireGuard API")

# Autoriser React à communiquer avec FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent

# Charger les modèles une seule fois
person_model = YOLO(str(BASE_DIR / "yolo11n.pt"))

fire_model = YOLO(str(
    BASE_DIR / "runs/detect/runs/fireguard/fire_final/weights/best.pt"
))

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

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB"
        )

    suffix = ".png" if file.content_type == "image/png" else ".jpg"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=suffix
        ) as temp:
            temp.write(image_bytes)
            temp_path = temp.name

        # Détection des personnes
        person_results = person_model(
            temp_path, verbose=False, conf=0.25
        )

        persons = sum(
            1
            for result in person_results
            for box in result.boxes
            if int(box.cls[0]) == 0
        )

        # Détection du feu et de la fumée
        fire_results = fire_model(
            temp_path, verbose=False, conf=0.25
        )

        fire_detected = False
        smoke_detected = False

        for result in fire_results:
            for box in result.boxes:
                class_name = result.names[
                    int(box.cls[0])
                ].lower()

                if class_name == "fire":
                    fire_detected = True
                elif class_name == "smoke":
                    smoke_detected = True

        # Priorisation simplifiée
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
            "priority": priority
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
