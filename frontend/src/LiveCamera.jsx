
import { useEffect, useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000/analyze";

export default function LiveCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const monitoringRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Camera stopped");

  async function startCamera() {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraActive(true);
      setStatus("Camera ready");
    } catch (err) {
      setError("Camera error: " + err.message);
    }
  }

  function stopMonitoring() {
    monitoringRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setMonitoring(false);
    setStatus("Monitoring stopped");
  }

  function stopCamera() {
    stopMonitoring();

    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setResult(null);
    setStatus("Camera stopped");
  }

  async function analyzeFrame() {
    if (
      !monitoringRef.current ||
      busyRef.current ||
      !videoRef.current ||
      videoRef.current.readyState < 2
    ) {
      return;
    }

    busyRef.current = true;
    setStatus("Analyzing camera frame...");

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");

      canvas.width = 640;
      canvas.height = Math.round(
        640 * video.videoHeight / video.videoWidth
      );

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/jpeg", 0.8);
      });

      if (!blob) {
        throw new Error("Could not capture camera frame");
      }

      const formData = new FormData();
      formData.append("file", blob, "camera-frame.jpg");

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }

      const data = await response.json();

      if (!monitoringRef.current) return;

      setResult(data);
      setError("");
      setStatus("AI monitoring active");
    } catch (err) {
      if (monitoringRef.current) {
        setResult(null);
        setError("Analysis failed: " + err.message);
        setStatus("Analysis unavailable");
      }
    } finally {
      busyRef.current = false;
    }
  }

  function startMonitoring() {
    if (!cameraActive || monitoringRef.current) return;

    monitoringRef.current = true;
    setMonitoring(true);
    setError("");
    setStatus("Starting AI monitoring...");

    analyzeFrame();
    timerRef.current = setInterval(analyzeFrame, 2000);
  }

  useEffect(() => {
    return () => {
      monitoringRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const danger = result?.fire_detected || result?.smoke_detected;

  return (
    <div style={{
      background: "#162236",
      borderRadius: "16px",
      padding: "25px",
      marginTop: "25px",
      marginBottom: "25px",
      color: "white"
    }}>
      <h2>📹 FireGuard Live AI Monitoring</h2>

      <p style={{ color: "#9fb0c8" }}>
        Real-time fire, smoke and person detection
      </p>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "100%",
          maxHeight: "420px",
          background: "#080e18",
          borderRadius: "12px",
          marginTop: "15px"
        }}
      />

      <p>Status: <strong>{status}</strong></p>

      <div style={{
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
        marginTop: "20px"
      }}>
        {!cameraActive ? (
          <button onClick={startCamera}>
            ▶ Start Camera
          </button>
        ) : (
          <>
            <button onClick={stopCamera}>
              ■ Stop Camera
            </button>

            {!monitoring ? (
              <button onClick={startMonitoring}>
                🔍 Start AI Monitoring
              </button>
            ) : (
              <button onClick={stopMonitoring}>
                ⏸ Stop AI Monitoring
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <p style={{ color: "#ff7777" }}>{error}</p>
      )}

      {result && (
        <div style={{
          marginTop: "25px",
          padding: "20px",
          background: danger ? "#482328" : "#153b35",
          borderRadius: "12px"
        }}>
          <h3>
            {danger ? "⚠ Potential danger detected" : "✓ No danger detected"}
          </h3>

          <p>🔥 Fire: {result.fire_detected ? "DETECTED" : "Not detected"}</p>
          <p>💨 Smoke: {result.smoke_detected ? "DETECTED" : "Not detected"}</p>
          <p>👥 People: {result.persons ?? 0}</p>
          <p>🚨 Priority: {result.priority ?? "UNKNOWN"}</p>
        </div>
      )}
    </div>
  );
}
