import { useEffect, useRef, useState } from 'react';

const API_URL = 'http://127.0.0.1:8000/analyze';

export default function LiveCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false);
  const monitoringRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Camera stopped');

  async function startCamera() {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      setStatus('Camera ready');
    } catch (err) {
      setError('Camera error: ' + err.message);
    }
  }

  function stopMonitoring() {
    monitoringRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setMonitoring(false);
    setStatus('Monitoring stopped');
  }

  function stopCamera() {
    stopMonitoring();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setResult(null);
    setStatus('Camera stopped');
  }

  async function analyzeFrame() {
    if (!monitoringRef.current || busyRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
    busyRef.current = true;
    setStatus('Analyzing camera frame...');
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = Math.round(640 * video.videoHeight / video.videoWidth);
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) throw new Error('Could not capture camera frame');
      const formData = new FormData();
      formData.append('file', blob, 'camera-frame.jpg');
      const response = await fetch(API_URL, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      if (!monitoringRef.current) return;
      setResult(data);
      setError('');
      setStatus('AI monitoring active');
    } catch (err) {
      if (monitoringRef.current) {
        setResult(null);
        setError('Analysis failed: ' + err.message);
        setStatus('Analysis unavailable');
      }
    } finally { busyRef.current = false; }
  }

  function startMonitoring() {
    if (!cameraActive || monitoringRef.current) return;
    monitoringRef.current = true;
    setMonitoring(true);
    setError('');
    setStatus('Starting AI monitoring...');
    analyzeFrame();
    timerRef.current = setInterval(analyzeFrame, 2000);
  }

  useEffect(() => () => {
    monitoringRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const danger = result?.fire_detected || result?.smoke_detected;
  return <div className="camera-card">
    <div className="camera-preview">
      <div className="camera-topline"><span><i className={cameraActive ? 'camera-led active' : 'camera-led'}/>{cameraActive ? 'CAMERA CONNECTED' : 'NO CAMERA INPUT'}</span><span>LIVE FEED / 01</span></div>
      <video ref={videoRef} autoPlay muted playsInline/>
      {!cameraActive && <div className="camera-placeholder"><div className="camera-placeholder-icon">⌁</div><b>Your live view starts here.</b><span>Enable your camera to monitor a scene in real time.</span></div>}
      {monitoring && <div className="scan-overlay"><span>AI SCANNING</span><i/></div>}
      <div className="camera-corner corner-tl"/><div className="camera-corner corner-br"/>
    </div>
    <div className="camera-controls">
      <div className="camera-control-heading"><span className="micro-label">LIVE MONITORING</span><b>{status}</b><small>Frames are sent to the same /analyze endpoint every 2 seconds while monitoring is active.</small></div>
      <div className="camera-buttons">
        {!cameraActive ? <button className="camera-primary" onClick={startCamera}>ENABLE CAMERA <span>↗</span></button> : <>
          {!monitoring ? <button className="camera-primary" onClick={startMonitoring}>START AI SCAN <span>↗</span></button> : <button className="camera-stop" onClick={stopMonitoring}>PAUSE SCAN <span>Ⅱ</span></button>}
          <button className="camera-secondary" onClick={stopCamera}>DISCONNECT</button>
        </>}
      </div>
      {error && <div className="camera-error">{error}</div>}
      {result && <div className={`camera-result ${danger ? 'has-danger' : ''}`}>
        <span className="micro-label">LATEST FRAME RESULT</span>
        <b>{danger ? 'Potential hazard detected' : 'No fire or smoke detected'}</b>
        <div><span>FIRE <strong>{result.fire_detected ? 'YES' : 'NO'}</strong></span><span>SMOKE <strong>{result.smoke_detected ? 'YES' : 'NO'}</strong></span><span>PEOPLE <strong>{result.persons ?? 0}</strong></span><span>PRIORITY <strong>{result.priority ?? 'UNKNOWN'}</strong></span></div>
      </div>}
    </div>
  </div>;
}
