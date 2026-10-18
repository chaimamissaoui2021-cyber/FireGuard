# 🔥 FireGuard — Intelligent Fire Detection & Rescue Prioritization

**FireGuard** is an academic web application designed to detect fire, smoke, and people in images using computer vision and to demonstrate a rule-based emergency prioritization system.

The project combines a React frontend, a FastAPI backend, and YOLO object detection models.

## 🎯 Project Objectives

- Detect fire and smoke in uploaded images.
- Identify and count people present in the scene.
- Estimate an emergency priority level using predefined rules.
- Display detection results through a user-friendly web interface.
- Demonstrate the integration of artificial intelligence into a web application.

## 🛠️ Technologies Used

| Component | Technology |
|---|---|
| Frontend | React.js, Vite, CSS |
| Backend | Python, FastAPI |
| Computer Vision | YOLO11, Ultralytics |
| Deep Learning | PyTorch |
| Version Control | Git, GitHub |
| Development Environment | Visual Studio Code |

## 📁 Project Structure

```text
FireGuard/
├── backend/
│   ├── main.py
│   ├── analyze.py
│   ├── detect.py
│   ├── train_improved.py
│   ├── yolo11n.pt
│   └── models/
│       └── best.pt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── test-data/
├── .gitignore
└── README.md
```

*Note: Some model files and datasets may be excluded from GitHub and must be provided separately.*

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/chaimamissaoui2021-cyber/FireGuard.git
cd FireGuard
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install the required Python dependencies:

```bash
python -m pip install ultralytics fastapi uvicorn python-multipart
```

Start the API server:

```bash
python -m uvicorn main:app --reload
```

Backend URL: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

**Model requirements:** The YOLO-enabled backend requires the pretrained person detection model and the trained fire/smoke model at the paths configured in `main.py`.

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: http://localhost:5173

Vite may use another available port, such as `5174`. The frontend origin must be authorized by the backend CORS configuration.

## 🔍 How FireGuard Works

1. The user uploads a JPG or PNG image.
2. React sends the image to the FastAPI `/analyze` endpoint.
3. YOLO models analyze the image to detect fire, smoke, and people.
4. The backend calculates a priority level using predefined rules.
5. The frontend displays the analysis results.

## 🚨 Rescue Priority System

| Condition | Priority |
|---|---|
| Fire detected + 3 or more people | CRITIQUE |
| Fire detected + 1–2 people | ELEVEE |
| Fire detected without people | MOYENNE |
| Smoke detected without fire | ATTENTION |
| No fire or smoke detected | FAIBLE |

These priorities are simplified demonstration rules and do not represent validated emergency response recommendations.

## 🧪 Demo Mode

FireGuard also supports a temporary demonstration backend that returns simulated results without running YOLO.

Example API response:

```json
{
  "fire_detected": true,
  "smoke_detected": false,
  "persons": 2,
  "priority": "ELEVEE"
}
```

**Important:** Demo mode does not perform real image detection. The results are predefined and must not be interpreted as predictions.

## 📊 Model Training

The fire/smoke detector is based on YOLO11 and a labeled image dataset.

The project includes `train_improved.py` for experimenting with additional training epochs and higher image resolution.

Detection performance depends on dataset quality, model training, confidence thresholds, and test conditions.

## 👩‍💻 Team Collaboration

This project is developed collaboratively by two students.

- **Backend & AI:** Python, FastAPI, YOLO integration, model training and testing.
- **Frontend:** React interface, UI design, API integration and results visualization.

GitHub is used for version control, branches, commits, and collaborative development.

## ⚠️ Limitations

FireGuard is an educational prototype.

- Detection results may contain false positives or false negatives.
- Small, distant, or obstructed objects may not be detected.
- Model confidence does not guarantee prediction correctness.
- The application is not certified for real-world fire monitoring or emergency rescue decisions.

## 🔮 Future Improvements

- Improve model accuracy using additional training data.
- Add bounding boxes and confidence scores to the interface.
- Support video and real-time detection.
- Add detection history and reporting.
- Improve emergency visualization and dashboard design.

---

**FireGuard — Academic Project 2026**

*Computer Vision • Web Development • Emergency Awareness*
