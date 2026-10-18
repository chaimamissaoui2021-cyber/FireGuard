
from ultralytics import YOLO
from pathlib import Path

# Charger le modèle YOLO
model = YOLO("yolo11n.pt")

# Chemin de l'image
image_path = Path(__file__).resolve().parent.parent / "test-data" / "people.jpg"

# Analyser l'image
results = model(str(image_path))

# Compter les personnes
persons = 0

for result in results:
    for box in result.boxes:
        class_id = int(box.cls[0])

        if class_id == 0:
            persons += 1

# Afficher les résultats
print("\n========================")
print("      FIREGUARD")
print("========================")
print(f"Persons detected: {persons}")

if persons > 0:
    print("Status: Persons detected")
else:
    print("Status: No persons detected")

# Enregistrer l'image avec les détections
for result in results:
    result.save(filename="result.jpg")

print("Result saved: result.jpg")
