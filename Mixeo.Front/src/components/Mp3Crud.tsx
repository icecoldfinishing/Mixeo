import React, { useState, useEffect, useRef } from 'react';
import type { Mp3File } from '../types/mp3';

const API_URL = 'http://localhost:5021/api/mp3';

function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return '—';
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

export const Mp3Crud: React.FC = () => {
  const [tracks, setTracks] = useState<Mp3File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState('');

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [duration, setDuration] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTracks(); }, []);

  const setStatusMsg = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  const fetchTracks = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) setTracks(await res.json());
    } catch {
      setTracks([]);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setTitle(''); setArtist(''); setAlbum('');
    setGenre(''); setYear(''); setDuration('');
    setFile(null); setFileName('');
    setSidebarOpen(true);
  };

  const openEdit = (track: Mp3File) => {
    setEditingId(track.id);
    setTitle(track.title || '');
    setArtist(track.artist || '');
    setAlbum(track.album || '');
    setGenre(track.genre || '');
    setYear(track.year?.toString() || '');
    setDuration(track.duration?.toString() || '');
    setFile(null); setFileName('');
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    if (editingId !== null) {
      const body = {
        title: title || null,
        artist: artist || null,
        album: album || null,
        genre: genre || null,
        year: year ? parseInt(year) : null,
        duration: duration ? parseInt(duration) : null,
      };
      try {
        const res = await fetch(`${API_URL}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) { setStatusMsg('Morceau mis à jour.'); closeSidebar(); fetchTracks(); }
      } catch { setStatusMsg('Erreur lors de la modification.'); }
    } else {
      const fd = new FormData();
      fd.append('title', title);
      if (artist) fd.append('artist', artist);
      if (album) fd.append('album', album);
      if (genre) fd.append('genre', genre);
      if (year) fd.append('year', year);
      if (duration) fd.append('duration', duration);
      if (file) fd.append('file', file);
      try {
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
        if (res.ok) { setStatusMsg('Morceau ajouté.'); closeSidebar(); fetchTracks(); }
      } catch { setStatusMsg("Erreur lors de l'upload."); }
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer ce morceau ?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg('Morceau supprimé.');
        if (editingId === id) closeSidebar();
        fetchTracks();
      }
    } catch { setStatusMsg('Erreur lors de la suppression.'); }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'audio/mpeg' || f.name.endsWith('.mp3'))) {
      setFile(f);
      setFileName(f.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFileName(f?.name ?? '');
  };

  return (
    <div style={s.root}>
      {/* Toolbar */}
      <header style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <span style={s.toolbarTitle}>Bibliothèque MP3</span>
          <span style={s.trackCount}>{tracks.length} morceau{tracks.length !== 1 ? 'x' : ''}</span>
        </div>
        <button
          style={s.addBtn}
          onClick={sidebarOpen ? closeSidebar : openAdd}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {sidebarOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
          </svg>
          {sidebarOpen ? 'Fermer' : 'Ajouter'}
        </button>
      </header>

      {/* Body */}
      <div style={s.body}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={s.sidebar}>
            <p style={s.sidebarHeading}>
              {editingId !== null ? `Modifier #${editingId}` : 'Nouveau morceau'}
            </p>

            <Field label="Titre *">
              <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du morceau" autoFocus />
            </Field>

            <div style={s.fieldRow}>
              <Field label="Artiste">
                <input style={s.input} value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artiste" />
              </Field>
              <Field label="Album">
                <input style={s.input} value={album} onChange={e => setAlbum(e.target.value)} placeholder="Album" />
              </Field>
            </div>

            <div style={s.fieldRow}>
              <Field label="Genre">
                <input style={s.input} value={genre} onChange={e => setGenre(e.target.value)} placeholder="Genre" />
              </Field>
              <Field label="Année">
                <input style={s.input} type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2024" />
              </Field>
            </div>

            <Field label="Durée (secondes)">
              <input style={s.input} type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="180" />
            </Field>

            {editingId === null && (
              <div
                style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.5 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span style={s.dropLabel}>{fileName || 'Déposer un fichier MP3'}</span>
                <input ref={fileInputRef} type="file" accept="audio/mp3,audio/mpeg" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            )}

            <div style={s.formActions}>
              <button style={s.btnSave} onClick={handleSave}>
                {editingId !== null ? 'Sauvegarder' : 'Uploader'}
              </button>
              <button style={s.btnCancel} onClick={closeSidebar}>Annuler</button>
            </div>
          </aside>
        )}

        {/* Table */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {['ID', 'Titre', 'Artiste', 'Album', 'Genre', 'Année', 'Durée', ''].map((h, i) => (
                  <th key={i} style={{ ...s.th, ...(i === 7 ? s.thCenter : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={s.empty}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true" style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }}>
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      <line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.5"/>
                    </svg>
                    Aucun fichier MP3
                  </td>
                </tr>
              ) : (
                tracks.map(t => (
                  <tr
                    key={t.id}
                    style={{ ...s.tr, ...(editingId === t.id ? s.trActive : {}) }}
                  >
                    <td style={{ ...s.td, ...s.tdMono }}>{t.id}</td>
                    <td style={{ ...s.td, ...s.tdBold }} title={t.title || ''}>{t.title || 'Sans titre'}</td>
                    <td style={{ ...s.td, ...s.tdMuted }} title={t.artist || ''}>{t.artist || '—'}</td>
                    <td style={{ ...s.td, ...s.tdMuted }} title={t.album || ''}>{t.album || '—'}</td>
                    <td style={s.td}>
                      {t.genre ? <span style={s.badge}>{t.genre}</span> : <span style={s.tdMuted}>—</span>}
                    </td>
                    <td style={{ ...s.td, ...s.tdMuted }}>{t.year || '—'}</td>
                    <td style={{ ...s.td, ...s.tdMuted }}>{fmtDuration(t.duration)}</td>
                    <td style={{ ...s.td, ...s.tdActions }}>
                      <button style={s.iconBtn} title="Modifier" onClick={() => openEdit(t)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button style={{ ...s.iconBtn, ...s.iconBtnDel }} title="Supprimer" onClick={() => handleDelete(t.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status bar */}
      <div style={s.statusBar}>{status}</div>
    </div>
  );
};

/* ─── sub-component ─── */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={s.fieldLabel}>{label}</label>
    {children}
  </div>
);

/* ─── styles ─── */
const s: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: 13,
    backgroundColor: '#0d0d0d',
    color: '#e8e6e1',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '0.5px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
    backgroundColor: '#0d0d0d',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#e8e6e1',
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '-0.01em',
  },
  trackCount: {
    fontSize: 12,
    color: '#555',
    paddingLeft: 4,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: 6,
    border: '0.5px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: 280,
    flexShrink: 0,
    borderRight: '0.5px solid rgba(255,255,255,0.08)',
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto',
    backgroundColor: '#111',
  },
  sidebarHeading: {
    fontSize: 12,
    fontWeight: 500,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 2,
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#555',
    fontWeight: 400,
  },
  input: {
    fontSize: 13,
    padding: '6px 9px',
    borderRadius: 6,
    border: '0.5px solid rgba(255,255,255,0.1)',
    background: '#1a1a1a',
    color: '#e8e6e1',
    outline: 'none',
    width: '100%',
  },
  dropZone: {
    border: '0.5px dashed rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    background: 'transparent',
    transition: 'background 0.15s',
  },
  dropZoneActive: {
    background: 'rgba(255,255,255,0.04)',
  },
  dropLabel: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  formActions: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  btnSave: {
    flex: 1,
    padding: '8px',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    border: 'none',
    background: '#e8e6e1',
    color: '#0d0d0d',
    cursor: 'pointer',
  },
  btnCancel: {
    padding: '8px 12px',
    fontSize: 13,
    borderRadius: 6,
    border: '0.5px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#666',
    cursor: 'pointer',
  },
  tableWrap: {
    flex: 1,
    overflowY: 'auto',
    minWidth: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    fontSize: 11,
    fontWeight: 500,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '10px 16px',
    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
    textAlign: 'left',
    position: 'sticky',
    top: 0,
    backgroundColor: '#0d0d0d',
    zIndex: 1,
  },
  thCenter: {
    textAlign: 'center',
    width: 80,
  },
  tr: {
    borderBottom: '0.5px solid rgba(255,255,255,0.04)',
    transition: 'background 0.1s',
  },
  trActive: {
    background: 'rgba(255,255,255,0.03)',
  },
  td: {
    padding: '9px 16px',
    fontSize: 13,
    color: '#e8e6e1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdMono: {
    color: '#444',
    fontVariantNumeric: 'tabular-nums',
    width: 52,
  },
  tdBold: {
    fontWeight: 500,
  },
  tdMuted: {
    color: '#555',
  },
  tdActions: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: 10,
    fontSize: 11,
    background: 'rgba(255,255,255,0.05)',
    color: '#888',
    border: '0.5px solid rgba(255,255,255,0.07)',
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: '0.5px solid rgba(255,255,255,0.08)',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#666',
  },
  iconBtnDel: {
    color: '#7f3030',
    borderColor: 'rgba(200,60,60,0.15)',
  },
  empty: {
    textAlign: 'center',
    padding: '56px 0',
    color: '#333',
    fontSize: 13,
  },
  statusBar: {
    padding: '7px 20px',
    fontSize: 12,
    color: '#555',
    borderTop: '0.5px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
    minHeight: 30,
    backgroundColor: '#0d0d0d',
  },
};