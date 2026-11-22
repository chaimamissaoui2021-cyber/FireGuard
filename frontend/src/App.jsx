import { useEffect, useMemo, useState } from 'react';
import './App.css';
import LiveCamera from './LiveCamera';

const API_URL = 'http://127.0.0.1:8000/analyze';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
    camera: <><path d="M14 5h-4l-2 3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="14" r="3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    flame: <path d="M12 22c4.4 0 7-3 7-7 0-3.3-2.1-5.5-4.3-8.2-.2 2.2-1.4 3.4-2.3 3.8C12.2 7.1 10 4.6 8 2c.2 4.2-1 6.1-2.5 8.4C4.4 12 4 13.5 4 15c0 4 3.1 7 8 7Z"/>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 20h16"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function StatCard({ icon, label, value, note, accent }) {
  return <article className={`metric-card ${accent || ''}`}>
    <div className="metric-top"><span className="metric-icon"><Icon name={icon}/></span><span className="metric-kicker">{note}</span></div>
    <div className="metric-value">{value}</div><div className="metric-label">{label}</div>
  </article>;
}

function priorityTone(priority = '') {
  const value = priority.toUpperCase();
  if (['CRITIQUE', 'CRITICAL', 'ELEVEE', 'HIGH'].includes(value)) return 'danger';
  if (['MOYENNE', 'MEDIUM', 'ATTENTION'].includes(value)) return 'warning';
  return 'safe';
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
    setError('');
    setResult(null);
    if (!candidate) return;
    if (!['image/jpeg', 'image/png'].includes(candidate.type)) { setError('Please upload a JPG or PNG image.'); return; }
    if (candidate.size > MAX_FILE_SIZE) { setError('Image must be smaller than 10 MB.'); return; }
    setFile(candidate);
  }

  async function analyze() {
    if (!file || loading) return;
    setLoading(true); setError(''); setResult(null);
    const form = new FormData();
    form.append('file', file);
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

  function navigateTo(name) {
    setActivePage(name);
    const sectionId = { Dashboard: 'top', 'Analyze Image': 'analyze', 'Live Camera': 'live-camera', History: 'history' }[name];
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  const navigation = [
    { name: 'Dashboard', icon: 'grid', number: '01' },
    { name: 'Analyze Image', icon: 'image', number: '02' },
    { name: 'Live Camera', icon: 'camera', number: '03' },
    { name: 'History', icon: 'clock', number: '04' },
  ];
  const tone = priorityTone(result?.priority);

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top" onClick={() => setActivePage('Dashboard')}>
        <span className="brand-symbol"><Icon name="shield"/></span>
        <span className="brand-copy"><strong>fireguard<span>.</span></strong><small>Fire & smoke detection</small></span>
      </a>
      
      <nav className="side-nav" aria-label="Main navigation">
        {navigation.map(item => <button key={item.name} className={`nav-item ${activePage === item.name ? 'active' : ''}`} onClick={() => navigateTo(item.name)}>
          <span className="nav-icon"><Icon name={item.icon}/></span><span>{item.name}</span><small>{item.number}</small>
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="status-orbit"><span/></div>
        <div><b>Detection core</b><small>Ready when you are</small></div>
        
      </div>
      
    </aside>

    <main className="main" id="top">
      <header className="topbar">
        <div className="breadcrumb"><span>FIREGUARD</span><i>/</i><b>{activePage.toUpperCase()}</b></div>
        <div className="topbar-right"><span className="date-label">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          
          <h1>Welcome to FireGuard</h1>
          <p>Upload an image or use your camera to detect fire, smoke and people.</p>
          <button className="hero-link" onClick={() => navigateTo('Analyze Image')}>Analyze an image <Icon name="arrow"/></button>
        </div>
      </section>

      <section className="metrics-section">
        <div className="section-heading"><div><h2>Your overview</h2></div></div>
        <div className="metrics-grid">
          <StatCard icon="image" label="Images analyzed" value={history.length.toString().padStart(2, '0')} note="THIS SESSION" />
          <StatCard icon="alert" label="Fire detections" value={totalFire.toString().padStart(2, '0')} note="FLAGGED" accent="metric-fire"/>
          <StatCard icon="users" label="People identified" value={totalPeople.toString().padStart(2, '0')} note="TOTAL COUNT" accent="metric-people"/>
          <StatCard icon="activity" label="System status" value="Ready" note="ON REQUEST" accent="metric-ready"/>
        </div>
      </section>

      <section className="analysis-section" id="analyze">
        <div className="section-heading"><div><h2>Image check</h2></div></div>
        <div className="analysis-grid">
          <article className="surface upload-surface">
            <div className="surface-heading"><div><h3>Choose an image.</h3><p>Choose a still image to scan for visual risk signals.</p></div></div>
            <label className={`dropzone ${dragging ? 'dragging' : ''} ${preview ? 'has-image' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setDragging(false); }}
              onDrop={e => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files?.[0]); }}>
              <input type="file" accept="image/png,image/jpeg" onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ''; }}/>
              {preview ? <><img className="preview-image" src={preview} alt="Selected for analysis"/><span className="preview-overlay">Choose another image</span></> :
                <div className="upload-prompt"><span className="upload-graphic"><Icon name="upload"/></span><b>Drag your image here</b><span>or <u>browse files</u></span><small>JPG or PNG · Up to 10 MB</small></div>}
            </label>
            <div className="file-meta"><span className="file-indicator"/><span className="file-name">{file ? file.name : 'No image selected'}</span>{file && <button className="remove-file" onClick={() => { setFile(null); setResult(null); setError(''); }}>REMOVE ×</button>}</div>
            <button className="analyze-button" disabled={!file || loading} onClick={analyze}><span>{loading ? 'Analyzing…' : 'Analyze image'}</span><span className="button-arrow">{loading ? '···' : '↗'}</span></button>
            {error && <div className="error-box" role="alert"><Icon name="alert"/>{error}</div>}
            
          </article>

          <article className="surface result-surface">
            <div className="surface-heading"><div><h3>Your results.</h3><p>Signals returned by the connected AI pipeline.</p></div></div>
            {!result ? <div className="result-placeholder"><div className="placeholder-visual"><div className="placeholder-ring"><span><Icon name="activity"/></span></div><i className="pulse-dot"/></div><b>Ready when you are</b><p>Your results will show here after the image is checked.</p></div> :
              <div className="report-content">
                <div className={`priority-report ${tone}`}><div><span className="micro-label">Priority</span><strong>{result.priority}</strong></div><span className="priority-icon">{tone === 'danger' ? <Icon name="alert"/> : tone === 'warning' ? '!' : <Icon name="check"/>}</span></div>
                <div className="signal-list">
                  <div className="signal-row"><span className="signal-symbol fire-symbol"><Icon name="flame"/></span><span><b>Fire</b><small>Fire detection</small></span><strong className={result.fire_detected ? 'signal-bad' : 'signal-good'}>{result.fire_detected ? 'Detected' : 'Not detected'}</strong></div>
                  <div className="signal-row"><span className="signal-symbol smoke-symbol">≋</span><span><b>Smoke</b><small>Smoke detection</small></span><strong className={result.smoke_detected ? 'signal-bad' : 'signal-good'}>{result.smoke_detected ? 'Detected' : 'Not detected'}</strong></div>
                  <div className="signal-row"><span className="signal-symbol people-symbol"><Icon name="users"/></span><span><b>People</b><small>People detected</small></span><strong className="people-count">{result.persons}</strong></div>
                </div>
                
              </div>}
          </article>
        </div>
      </section>

      <section className="camera-section" id="live-camera">
        <div className="section-heading"><div><h2>Live camera</h2></div></div>
        <LiveCamera/>
      </section>

      <section className="history-section" id="history">
        <div className="section-heading"><div><h2>Recent scans</h2></div></div>
        <div className="surface history-surface">
          {history.length === 0 ? <div className="history-empty"><span className="history-empty-icon"><Icon name="clock"/></span><div><b>No scan history yet</b><p>Completed image analyses will be listed here.</p></div><span className="empty-count">00 / 08</span></div> :
            <div className="table-wrap"><table><thead><tr><th>Image</th><th>TIME</th><th>FIRE</th><th>SMOKE</th><th>PEOPLE</th><th>PRIORITY</th></tr></thead><tbody>{history.map((entry, i) => <tr key={`${entry.time}-${i}`}><td className="filename-cell">{entry.filename}</td><td>{entry.time}</td><td><span className={entry.fire_detected ? 'table-danger' : 'table-clear'}>{entry.fire_detected ? 'Detected' : 'Clear'}</span></td><td><span className={entry.smoke_detected ? 'table-danger' : 'table-clear'}>{entry.smoke_detected ? 'Detected' : 'Clear'}</span></td><td>{entry.persons}</td><td><span className={`table-priority ${priorityTone(entry.priority)}`}>{entry.priority}</span></td></tr>)}</tbody></table></div>}
        </div>
      </section>

      <footer className="app-footer"><span className="footer-brand">FIREGUARD<span className="footer-dot">.</span></span></footer>
    </main>
  </div>;
}
