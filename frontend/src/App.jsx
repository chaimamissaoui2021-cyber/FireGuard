import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'http://127.0.0.1:8000/analyze';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function StatCard({ icon, label, value, detail, tone = '' }) {
  return <div className={`stat-card ${tone}`}><div className="stat-icon">{icon}</div><div><p className="muted tiny">{label}</p><strong>{value}</strong><span className="stat-detail">{detail}</span></div></div>;
}

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const totalFire = useMemo(() => history.filter(x => x.fire_detected).length, [history]);
  const totalPeople = useMemo(() => history.reduce((sum, x) => sum + x.persons, 0), [history]);

  function selectFile(candidate) {
    setError(''); setResult(null);
    if (!candidate) return;
    if (!['image/jpeg', 'image/png'].includes(candidate.type)) {
      setError('Please upload a JPG or PNG image.'); return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError('Image must be smaller than 10 MB.'); return;
    }
    setFile(candidate);
  }

  async function analyze() {
    if (!file || loading) return;
    setLoading(true); setError(''); setResult(null);
    const form = new FormData(); form.append('file', file);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: form });
      if (!response.ok) {
        let detail = `API returned status ${response.status}`;
        try { const data = await response.json(); detail = typeof data.detail === 'string' ? data.detail : detail; } catch {}
        throw new Error(detail);
      }
      const data = await response.json();
      const normalized = {
        fire_detected: Boolean(data.fire_detected),
        smoke_detected: Boolean(data.smoke_detected),
        persons: Math.max(0, Number(data.persons) || 0),
        priority: String(data.priority ?? 'UNKNOWN'),
        detections: Array.isArray(data.detections) ? data.detections : [],
      };
      setResult(normalized);
      setHistory(old => [{ ...normalized, filename: file.name, time: new Date().toLocaleTimeString() }, ...old].slice(0, 8));
    } catch (e) {
      setError(e instanceof TypeError ? 'Unable to connect to FireGuard API. Check FastAPI and CORS settings.' : e.message);
    } finally { setLoading(false); }
  }

  const priority = result?.priority?.toUpperCase() || '';
  const danger = ['CRITIQUE', 'CRITICAL', 'ELEVEE', 'HIGH'].includes(priority);
  const warning = ['MOYENNE', 'MEDIUM', 'ATTENTION'].includes(priority);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">♨</div><div><b>FireGuard</b><small>INTELLIGENT MONITORING</small></div></div>
      <div className="side-label">WORKSPACE</div>
      <nav>
        {['Dashboard', 'Analyze Image', 'History'].map((name, i) => <button key={name} className={`nav-item ${activePage === name ? 'active' : ''}`} onClick={() => { setActivePage(name); document.getElementById(name === 'History' ? 'history' : name === 'Analyze Image' ? 'analyze' : 'top')?.scrollIntoView({ behavior: 'smooth' }); }}><span>{['▦', '◈', '◷'][i]}</span>{name}</button>)}
      </nav>
      <div className="side-bottom"><div className="online-dot"/> System dashboard <small>Academic prototype • 2026</small></div>
    </aside>

    <main className="main" id="top">
      <header className="topbar"><div><span className="eyebrow">OVERVIEW / DASHBOARD</span><h1>Fire Detection Dashboard</h1><p className="muted">Analyze images, identify potential risks and review detection results.</p></div><div className="header-pill"><span className="online-dot"/> FireGuard Platform</div></header>

      <section className="stats-grid">
        <StatCard icon="▤" label="Images analyzed" value={history.length} detail="This session" />
        <StatCard icon="♨" label="Fire detections" value={totalFire} detail="Flagged analyses" tone="red" />
        <StatCard icon="♙" label="People detected" value={totalPeople} detail="Across analyses" tone="blue" />
        <StatCard icon="◉" label="System status" value="Ready" detail="API connection checked on request" tone="green" />
      </section>

      <section className="content-grid" id="analyze">
        <div className="panel upload-panel"><div className="panel-head"><div><span className="eyebrow">IMAGE ANALYSIS</span><h2>Upload an image</h2><p className="muted">Choose an image to check for fire, smoke and people.</p></div><span className="step-tag">01 / ANALYZE</span></div>
          <label className={`dropzone ${dragging ? 'dragging' : ''} ${preview ? 'has-image' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { e.preventDefault(); setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files?.[0]); }}>
            <input type="file" accept="image/png,image/jpeg" onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ''; }} />
            {preview ? <><img className="preview-image" src={preview} alt="Selected for analysis"/><span className="change-image">Click or drop to replace image</span></> : <><div className="upload-icon">↥</div><b>Drop your image here</b><span>or click to browse files</span><small>JPG or PNG • Max 10 MB</small></>}
          </label>
          <div className="file-row"><span className="muted">{file ? `Selected: ${file.name}` : 'No image selected'}</span>{file && <button className="text-button" onClick={() => { setFile(null); setResult(null); setError(''); }}>Remove</button>}</div>
          <button className="analyze-button" disabled={!file || loading} onClick={analyze}>{loading ? 'Analyzing image…' : '◈  Analyze Image'} <span>→</span></button>
          {error && <div className="error-box" role="alert">⚠ {error}</div>}
        </div>

        <div className="panel result-panel"><div className="panel-head"><div><span className="eyebrow">AI DETECTION</span><h2>Analysis results</h2><p className="muted">Response received from the FastAPI backend.</p></div><span className="step-tag">02 / RESULTS</span></div>
          {!result ? <div className="empty-results"><div className="radar"><span>◎</span></div><h3>Waiting for analysis</h3><p>Upload an image and click Analyze Image to see the detection results.</p></div> : <div className="results-content"><div className={`priority-banner ${danger ? 'danger' : warning ? 'warning' : 'safe'}`}><div><small>DETECTED PRIORITY</small><strong>{result.priority}</strong></div><span>{danger ? '⚠' : warning ? '!' : '✓'}</span></div><div className="result-grid"><div className="result-tile"><small>FIRE</small><b className={result.fire_detected ? 'bad' : 'good'}>{result.fire_detected ? 'Detected' : 'Not detected'}</b></div><div className="result-tile"><small>SMOKE</small><b className={result.smoke_detected ? 'bad' : 'good'}>{result.smoke_detected ? 'Detected' : 'Not detected'}</b></div><div className="result-tile wide"><small>PEOPLE DETECTED</small><b>{result.persons}</b></div></div><p className="result-note">Results are generated by the connected backend. In demo mode, values are simulated.</p></div>}
        </div>
      </section>

      <section className="panel history-panel" id="history"><div className="panel-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Analysis history</h2><p className="muted">Recent results from this browser session.</p></div><span className="step-tag">SESSION LOG</span></div>
        {history.length === 0 ? <div className="history-empty">No analyses yet. Your recent results will appear here.</div> : <div className="table-wrap"><table><thead><tr><th>Image</th><th>Time</th><th>Fire</th><th>Smoke</th><th>People</th><th>Priority</th></tr></thead><tbody>{history.map((entry, i) => <tr key={`${entry.time}-${i}`}><td className="filename">{entry.filename}</td><td>{entry.time}</td><td>{entry.fire_detected ? 'Yes' : 'No'}</td><td>{entry.smoke_detected ? 'Yes' : 'No'}</td><td>{entry.persons}</td><td><span className="priority-chip">{entry.priority}</span></td></tr>)}</tbody></table></div>}
      </section>
      <footer>FireGuard © 2026 · Academic computer vision prototype · Not for emergency decision-making</footer>
    </main>
  </div>;
}
