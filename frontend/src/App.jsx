
import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeImage() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("API error");
      }

      const data = await response.json();
      setResult(data);
    } catch {
      setError("Unable to connect to FireGuard API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🔥 FireGuard</h1>
        <p>Intelligent Fire Detection System</p>
      </header>

      <main className="container">
        <section className="card">
          <h2>Fire & Smoke Detection</h2>
          <p>Upload an image to analyze potential fire hazards.</p>

          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => {
              setFile(e.target.files[0] || null);
              setResult(null);
              setError("");
            }}
          />

          {file && (
            <p className="filename">{file.name}</p>
          )}

          <button
            onClick={analyzeImage}
            disabled={!file || loading}
          >
            {loading ? "Analyzing..." : "Analyze Image"}
          </button>

          {error && <p className="error">{error}</p>}
        </section>

        {result && (
          <section className="card">
            <h2>Detection Results</h2>

            <div className="results">
              <div className="stat">
                <span>🔥 Fire</span>
                <strong>
                  {result.fire_detected ? "Detected" : "No"}
                </strong>
              </div>

              <div className="stat">
                <span>💨 Smoke</span>
                <strong>
                  {result.smoke_detected ? "Detected" : "No"}
                </strong>
              </div>

              <div className="stat">
                <span>👤 People</span>
                <strong>{result.persons ?? 0}</strong>
              </div>
            </div>

            <div className="priority">
              <h3>Rescue Priority</h3>
              <strong>{result.priority}</strong>
            </div>
          </section>
        )}
      </main>

      <footer>FireGuard | Academic Project 2026</footer>
    </div>
  );
}

export default App;
