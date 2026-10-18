from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
    data="fire-dataset/data.yaml",
    epochs=30,
    imgsz=640,
    batch=4,
    device="cpu",
    project="runs/fireguard",
    name="fire_improved"
)