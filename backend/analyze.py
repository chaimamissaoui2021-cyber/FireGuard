
from ultralytics import YOLO
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Charger les modèles
person_model = YOLO(str(BASE_DIR / "yolo11n.pt"))

fire_model = YOLO(str(
    BASE_DIR / "runs/detect/runs/fireguard/fire_final/weights/best.pt"
))

# Image à analyser
image_path = BASE_DIR.parent / "test-data" / "fper.jpg"

# Seuils de confiance
PERSON_CONF = 0.25
FIRE_CONF = 0.55
SMOKE_CONF = 0.45

# Détection des personnes
person_results = person_model(
    str(image_path),
    conf=PERSON_CONF,
    classes=[0],
    imgsz=640,
    verbose=False
)

persons = sum(
    len(result.boxes)
    for result in person_results
)

# Détection feu / fumée
fire_results = fire_model(
    str(image_path),
    conf=min(FIRE_CONF, SMOKE_CONF),
    imgsz=640,
    verbose=False
)

fire_detected = False
smoke_detected = False

print("\n--- DETECTIONS ---")

for result in fire_results:
    for box in result.boxes:
        class_name = result.names[int(box.cls[0])].lower()
        confidence = float(box.conf[0])

        print(f"{class_name}: {confidence:.2f}")

        if class_name == "fire" and confidence >= FIRE_CONF:
            fire_detected = True

        elif class_name == "smoke" and confidence >= SMOKE_CONF:
            smoke_detected = True

# Priorité : règles de démonstration
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

print("\n========== FIREGUARD ==========")
print(f"Fire detected: {fire_detected}")
print(f"Smoke detected: {smoke_detected}")
print(f"Persons detected: {persons}")
print(f"Priority: {priority}")
print("================================")
