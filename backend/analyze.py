
from ultralytics import YOLO
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Charger les deux modèles
person_model = YOLO(str(BASE_DIR / "yolo11n.pt"))

fire_model = YOLO(str(
    BASE_DIR / "runs/detect/runs/fireguard/fire_final/weights/best.pt"
))

# Image à analyser
image_path = BASE_DIR.parent / "test-data" / "fper.jpg"

# Détection des personnes
person_results = person_model(str(image_path), verbose=False)

persons = sum(
    1
    for result in person_results
    for box in result.boxes
    if int(box.cls[0]) == 0
)

# Détection du feu et de la fumée
fire_results = fire_model(str(image_path), verbose=False)

fire_detected = False
smoke_detected = False

for result in fire_results:
    for box in result.boxes:
        class_name = result.names[int(box.cls[0])].lower()

        if class_name == "fire":
            fire_detected = True

        elif class_name == "smoke":
            smoke_detected = True

# Calcul de priorité (règles de démonstration)
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
