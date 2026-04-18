import { useState, useCallback, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { parseInputCSV, parseISBNList, rowsToCsv } from './services/csvProcessor';
import type { InputRow } from './services/csvProcessor';
import { useScraper } from './hooks/useScraper';
import { getImage, getAllStoredISBNs, base64ToBlob, clearAllImages, getStorageUsageMB } from './services/imageStorage';
import {
  isDemoMode,
  capInputsForDemo,
  canStartDemoScrape,
  recordDemoScrapeStart,
  canDemoExport,
  recordDemoExport,
  recordDemoFileSeen,
} from './config/demo';
import './App.css';

type Tab = 'upload' | 'results';

export default function App() {
  const [tab, setTab] = useState<Tab>('upload');
  const [inputs, setInputs] = useState<InputRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  const [storageInfo, setStorageInfo] = useState<string>('');
  const [demoUsageTick, setDemoUsageTick] = useState(0);
  const [demoQuotaModalOpen, setDemoQuotaModalOpen] = useState(false);
  const { status, rows, progress, run, pause, resume, stop, reset } = useScraper();
  const isDemo = useMemo(() => isDemoMode(), []);
  const exportBlocked = useMemo(() => (isDemo ? !canDemoExport() : false), [isDemo, demoUsageTick]);
  const demoBlockStart = useMemo(() => (isDemo ? !canStartDemoScrape() : false), [isDemo, demoUsageTick]);

  useEffect(() => {
    if (isDemo && demoBlockStart && tab === 'upload') {
      setDemoQuotaModalOpen(true);
    }
  }, [isDemo, demoBlockStart, tab, demoUsageTick]);

  const handleFile = useCallback((file: File) => {
    setParseError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let parsed = parseInputCSV(text);
        if (parsed.length === 0) parsed = parseISBNList(text);
        if (parsed.length === 0) { setParseError('No se encontraron ISBNs válidos.'); return; }
        if (isDemo) recordDemoFileSeen();
        setInputs(capInputsForDemo(parsed));
      } catch (err) { setParseError(`Error: ${err}`); }
    };
    reader.readAsText(file, 'utf-8');
  }, [isDemo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const startScrape = useCallback(() => {
    if (inputs.length === 0) return;
    if (isDemo && !canStartDemoScrape()) {
      setDemoQuotaModalOpen(true);
      return;
    }
    if (isDemo) {
      recordDemoScrapeStart();
      setDemoUsageTick((k) => k + 1);
    }
    setTab('results');
    run(inputs);
  }, [inputs, run, isDemo]);

  const downloadCSV = useCallback(() => {
    if (isDemo) {
      if (rows.length === 0 || !canDemoExport()) return;
    }
    if (rows.length === 0) return;
    const csv = rowsToCsv(rows);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'sbs_output.csv');
    if (isDemo) {
      recordDemoExport();
      setDemoUsageTick((k) => k + 1);
    }
  }, [rows, isDemo]);

  const downloadImages = useCallback(async () => {
    if (isDemo) {
      if (!canDemoExport()) return;
    }
    const isbns = getAllStoredISBNs();
    if (isbns.length === 0) { alert('No hay imágenes almacenadas.'); return; }
    const zip = new JSZip();
    const folder = zip.folder('imagenes')!;
    for (const isbn of isbns) {
      const b64 = getImage(isbn);
      if (b64) {
        const blob = base64ToBlob(b64);
        const ext = b64.startsWith('data:image/png') ? 'png' : 'jpg';
        folder.file(`${isbn}.${ext}`, blob);
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'sbs_imagenes.zip');
    if (isDemo) {
      recordDemoExport();
      setDemoUsageTick((k) => k + 1);
    }
  }, [isDemo]);

  const checkStorage = useCallback(() => {
    const mb = getStorageUsageMB();
    const count = getAllStoredISBNs().length;
    setStorageInfo(`${count} imgs · ${mb.toFixed(1)}MB`);
    setTimeout(() => setStorageInfo(''), 3000);
  }, []);

  const selectedRow = selectedRowIdx !== null ? rows[selectedRowIdx] : null;

  return (
    <div className="app">
      {isDemo && (
        <div className="demo-ribbon" role="status">
          <span className="demo-ribbon-title">Vista de demostración</span>
        </div>
      )}
      <header className="header">
        <div className="header-logo" title="Faro Azul — herramienta de catálogo SBS/VTEX">
          <div className="logo-wordmark">
            <span className="logo-faro">FARO</span>
            <span className="logo-azul">AZUL</span>
            <span className="logo-tagline">Herramienta catálogo SBS/VTEX</span>
          </div>
        </div>
        <nav className="header-nav">
          <button className={`nav-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Importar</button>
          <button className={`nav-btn ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')} disabled={rows.length === 0 && status === 'idle'}>
            Resultados {rows.length > 0 && <span className="badge">{rows.length}</span>}
          </button>
        </nav>
        <div className="header-actions">
          <button className="btn-ghost-sm" onClick={checkStorage}>💾</button>
          {storageInfo && <span className="storage-info">{storageInfo}</span>}
        </div>
      </header>

      <main className="main">
        {tab === 'upload' && (
          <div className="upload-view">
            <div className="upload-hero">
              <h1>Enriquecimiento<br /><em>de catálogo</em></h1>
              <p className="subtitle">Subí tu CSV con ISBNs y completamos los 33 campos desde SBS/VTEX</p>
            </div>

            <div className="dropzone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
              <div className="dropzone-icon">📂</div>
              <p className="dropzone-main">Arrastrá tu CSV aquí</p>
              <p className="dropzone-sub">o una lista de ISBNs (.txt) • clic para buscar</p>
              <input type="file" accept=".csv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFile(f); }} className="file-input" />
            </div>

            {parseError && <div className="error-banner">{parseError}</div>}

            {inputs.length > 0 && (
              <div className="ready-panel">
                <div className="ready-info">
                  <div className="ready-count">{inputs.length}</div>
                  <div className="ready-label">ISBNs detectados</div>
                  <div className="ready-preview">
                    {inputs.slice(0, 6).map(r => <span key={r.isbn} className="isbn-chip">{r.isbn}</span>)}
                    {inputs.length > 6 && <span className="isbn-chip">+{inputs.length - 6}</span>}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={startScrape}
                  disabled={demoBlockStart}
                  title={demoBlockStart ? 'No disponible' : undefined}
                >🚀 Iniciar scraping</button>
              </div>
            )}

            <div className="info-grid">
              <div className="info-card"><div className="info-icon">🔍</div><h3>Busca por ISBN</h3><p>API pública de VTEX / SBS por código de barras</p></div>
              <div className="info-card"><div className="info-icon">🖼️</div><h3>Descarga tapas</h3><p>Imágenes guardadas localmente con nombre ISBN</p></div>
              <div className="info-card"><div className="info-icon">📋</div><h3>21 → 33 columnas</h3><p>Completa campos RQ y valores por defecto</p></div>
              <div className="info-card"><div className="info-icon">⬇️</div><h3>CSV + ZIP</h3><p>Exporta el CSV final y un ZIP con todas las tapas</p></div>
            </div>
          </div>
        )}

        {tab === 'results' && (
          <div className="results-view">
            {(status === 'running' || status === 'paused') && (
              <div className="progress-bar-wrap">
                <div className="progress-info">
                  <span>ISBN actual: <strong>{progress.current}</strong></span>
                  <span>{progress.done} / {progress.total} — <span className="err-count">{progress.errors} errores</span></span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                <div className="progress-controls">
                  {status === 'running' ? <button className="btn-sm" onClick={pause}>⏸ Pausar</button> : <button className="btn-sm" onClick={resume}>▶ Reanudar</button>}
                  <button className="btn-sm btn-danger" onClick={stop}>⏹ Detener</button>
                </div>
              </div>
            )}

            <div className="results-toolbar">
              <div className="toolbar-left">
                <span className="results-count">{rows.length} productos</span>
                <span className={`status-badge status-${status}`}>{
                  status === 'running' ? '⚡ Procesando' : status === 'paused' ? '⏸ Pausado' : status === 'done' ? '✅ Completado' : ''
                }</span>
              </div>
              <div className="toolbar-right">
                <button
                  className="btn-outline"
                  onClick={downloadCSV}
                  disabled={rows.length === 0 || (isDemo && exportBlocked)}
                  title={isDemo && exportBlocked ? 'No disponible' : undefined}
                >
                  📥 Descargar CSV
                </button>
                <button
                  className="btn-outline"
                  onClick={downloadImages}
                  disabled={isDemo && exportBlocked}
                  title={isDemo && exportBlocked ? 'No disponible' : undefined}
                >
                  🗜️ ZIP imágenes
                </button>
                <button className="btn-ghost-sm" onClick={() => { clearAllImages(); alert('Imágenes borradas'); }}>🗑️</button>
                <button className="btn-ghost-sm" onClick={() => { reset(); setTab('upload'); }}>↩ Nuevo</button>
              </div>
            </div>

            <div className={`data-layout${selectedRow ? " with-detail" : ""}`}>
              <div className="datagrid-wrap">
                <table className="datagrid">
                  <thead>
                    <tr>
                      <th>#</th><th>ISBN</th><th>Nombre</th><th>Marca</th><th>Autor</th>
                      <th>Categoría</th><th>Precio</th><th>Tapa</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const img = getImage(row._isbn) || row['FOTO TAPA'];
                      return (
                        <tr key={row._isbn + i} className={`${selectedRowIdx === i ? 'selected' : ''} ${row._status === 'error' ? 'row-error' : ''}`} onClick={() => setSelectedRowIdx(i)}>
                          <td className="cell-num">{i + 1}</td>
                          <td className="cell-isbn">{row._isbn}</td>
                          <td className="cell-name" title={row['Nombre']}>{row['Nombre']}</td>
                          <td>{row['Marca']}</td>
                          <td>{row['Autor']}</td>
                          <td>{row['Categorías']}</td>
                          <td>{row['Precio'] ? `$${row['Precio']}` : '—'}</td>
                          <td className="cell-img">{img ? <img src={img} alt={row._isbn} className="thumb" crossOrigin="anonymous" /> : '—'}</td>
                          <td><span className={`status-dot ${row._status}`} title={row._error}>{row._status === 'ok' ? '✓' : row._status === 'error' ? '✗' : '…'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedRow && (
                <div className="detail-panel">
                  <button className="detail-close" onClick={() => setSelectedRowIdx(null)}>✕</button>
                  <h3 className="detail-title">{selectedRow['Nombre']}</h3>
                  {(() => { const img = getImage(selectedRow._isbn) || selectedRow['FOTO TAPA']; return img ? <img src={img} alt="" className="detail-img" crossOrigin="anonymous" /> : null; })()}
                  <div className="detail-fields">
                    {([['ISBN', selectedRow._isbn], ['SKU', selectedRow['SKU']], ['Editorial', selectedRow['Marca']], ['Autor', selectedRow['Autor']], ['Páginas', selectedRow['Pag.']], ['Encuadernación', selectedRow['Encuadernación']], ['Categoría', selectedRow['Categorías']], ['Edad', selectedRow['EDAD']], ['Precio', selectedRow['Precio']], ['Tags', selectedRow['Tags']]] as [string,string][]).map(([l,v]) => (
                      <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-val">{v||'—'}</span></div>
                    ))}
                  </div>
                  <div className="detail-section">
                    <div className="detail-section-title">Descripción Completa</div>
                    <div className="detail-desc" dangerouslySetInnerHTML={{ __html: selectedRow['Descripción Compuesta'] }} />
                  </div>
                  {selectedRow._error && <div className="detail-error">⚠ {selectedRow._error}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {isDemo && demoQuotaModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-quota-title"
          onClick={() => setDemoQuotaModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="demo-quota-title" className="modal-title">Límite de la demostración</h2>
            <p className="modal-body">
              El modo de demostración alcanzó su cuota. Para seguir, contacten a <strong>Structura</strong> y soliciten
              una nueva demostración o el acceso a la versión operativa.
            </p>
            <a className="modal-link" href="https://structura.com.ar" target="_blank" rel="noreferrer">structura.com.ar</a>
            <div className="modal-actions">
              <button type="button" className="btn-primary modal-ok" onClick={() => setDemoQuotaModalOpen(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
