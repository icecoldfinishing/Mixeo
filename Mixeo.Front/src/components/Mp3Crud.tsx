import React, { useState, useEffect, useRef } from 'react';
import type { Mp3File } from '../types/mp3';

const API_URL = 'http://localhost:5021/api/mp3';
const STREAM_URL = 'http://localhost:5021/api/playlists/stream';

function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return '—';
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

type SortField = 'year' | 'duration' | null;
type SortDir = 'asc' | 'desc';

export const Mp3Crud: React.FC = () => {
  const [tracks, setTracks] = useState<Mp3File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [duration, setDuration] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [useMetadata, setUseMetadata] = useState(false);

  // Filter state
  const [filterTitle, setFilterTitle] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [filterAlbum, setFilterAlbum] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Playback state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lyrics Modal
  const [lyricsModal, setLyricsModal] = useState({ open: false, trackId: null as number | null, title: '', text: '', loading: false });

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

  // ── Filter + Sort ──────────────────────────────────────
  const filteredTracks = React.useMemo(() => {
    let result = tracks.filter(t => {
      const matchTitle = !filterTitle || (t.title || '').toLowerCase().includes(filterTitle.toLowerCase());
      const matchArtist = !filterArtist || (t.artist || '').toLowerCase().includes(filterArtist.toLowerCase());
      const matchAlbum = !filterAlbum || (t.album || '').toLowerCase().includes(filterAlbum.toLowerCase());
      const matchGenre = !filterGenre || (t.genre || '').toLowerCase().includes(filterGenre.toLowerCase());
      return matchTitle && matchArtist && matchAlbum && matchGenre;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        const av = sortField === 'year' ? (a.year ?? 0) : (a.duration ?? 0);
        const bv = sortField === 'year' ? (b.year ?? 0) : (b.duration ?? 0);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
    }

    return result;
  }, [tracks, filterTitle, filterArtist, filterAlbum, filterGenre, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const hasActiveFilters = filterTitle || filterArtist || filterAlbum || filterGenre;

  const clearFilters = () => {
    setFilterTitle('');
    setFilterArtist('');
    setFilterAlbum('');
    setFilterGenre('');
  };

  // ── Playback ───────────────────────────────────────────
  const handlePlay = (track: Mp3File) => {
    if (!track.id || !track.filePath) return;

    // 1. Si on clique sur le morceau déjà en cours -> Pause
    if (playingId === track.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    // 2. Initialisation ou nettoyage de l'instance Audio unique
    if (!audioRef.current) {
      audioRef.current = new Audio();
    } else {
      audioRef.current.pause();
      audioRef.current.src = ""; // Libère proprement l'ancien flux de requêtes
    }

    try {
      // Utilisation du stream API robuste pour éviter les soucis de nom de fichier (caractères spéciaux, espaces...)
      // et gérer nativement le Range-Streaming pour le lecteur audio.
      const finalUrl = `${STREAM_URL}/${track.id}`;

      console.log("Tentative de lecture de l'URL via stream API :", finalUrl);

      audioRef.current.src = finalUrl;
      audioRef.current.load();

      audioRef.current.play()
        .then(() => {
          setPlayingId(track.id);
        })
        .catch((err) => {
          console.error("Erreur de lecture rencontrée :", err);
          setStatusMsg("Impossible de lire ce fichier (Vérifiez le format ou l'accès).");
          setPlayingId(null);
        });

      audioRef.current.onended = () => {
        setPlayingId(null);
      };

    } catch (e) {
      console.error(e);
      setStatusMsg('Erreur lors du chargement du lecteur.');
    }
  };
  // ── Sidebar ────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setTitle(''); setArtist(''); setAlbum('');
    setGenre(''); setYear(''); setDuration('');
    setFile(null); setFileName('');
    setUseMetadata(false);
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
    if (editingId !== null) {
      if (!title.trim()) return;
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
      if (useMetadata) {
        // Only send the file — backend reads metadata
        if (!file) { setStatusMsg('Veuillez sélectionner un fichier MP3.'); return; }
        fd.append('file', file);
        fd.append('useMetadata', 'true');
      } else {
        if (!title.trim()) return;
        fd.append('title', title);
        if (artist) fd.append('artist', artist);
        if (album) fd.append('album', album);
        if (genre) fd.append('genre', genre);
        if (year) fd.append('year', year);
        if (duration) fd.append('duration', duration);
        if (file) fd.append('file', file);
      }
      try {
        const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
        if (res.ok) { setStatusMsg('Morceau ajouté.'); closeSidebar(); fetchTracks(); }
        else { setStatusMsg("Erreur lors de l'upload."); }
      } catch { setStatusMsg("Erreur lors de l'upload."); }
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer ce morceau ?')) return;
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg('Morceau supprimé.');
        if (editingId === id) closeSidebar();
        fetchTracks();
      }
    } catch { setStatusMsg('Erreur lors de la suppression.'); }
  };

  const handleViewLyrics = async (track: Mp3File) => {
    if (!track.id) return;
    setLyricsModal({ open: true, trackId: track.id, title: track.title || 'Paroles', text: '', loading: true });
    try {
      const res = await fetch(`${API_URL}/${track.id}/lyrics`);
      if (res.ok) {
        const data = await res.json();
        setLyricsModal(prev => ({ ...prev, text: data.text, loading: false }));
      } else {
        setLyricsModal(prev => ({ ...prev, text: 'Paroles indisponibles.', loading: false }));
      }
    } catch {
      setLyricsModal(prev => ({ ...prev, text: 'Erreur réseau.', loading: false }));
    }
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

  // ── Sort icon helper ───────────────────────────────────
  const SortIcon = ({ field }: { field: SortField }) => {
    const active = sortField === field;
    return (
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.25, fontSize: 10 }}>
        {active && sortDir === 'desc' ? '↓' : '↑'}
      </span>
    );
  };

  return (
    <div style={s.root}>
      {/* Toolbar */}
      <header style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8e6e1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="2" y1="6" x2="14" y2="6" />
            <line x1="2" y1="12" x2="14" y2="12" />
            <line x1="2" y1="18" x2="10" y2="18" />
            <path d="M17 18V7l4 1" />
            <circle cx="15" cy="18" r="2" />
          </svg>
          <span style={s.toolbarTitle}>Bibliothèque MP3</span>
          <span style={s.trackCount}>{filteredTracks.length}/{tracks.length} morceau{tracks.length !== 1 ? 'x' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ ...s.addBtn, ...(hasActiveFilters ? s.addBtnActive : {}) }}
            onClick={() => setShowFilters(f => !f)}
            title="Filtres"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filtres{hasActiveFilters ? ` (${[filterTitle, filterArtist, filterAlbum, filterGenre].filter(Boolean).length})` : ''}
          </button>
          <button style={s.addBtn} onClick={sidebarOpen ? closeSidebar : openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {sidebarOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
            </svg>
            {sidebarOpen ? 'Fermer' : 'Ajouter'}
          </button>
        </div>
      </header>

      {/* Filter bar */}
      {showFilters && (
        <div style={s.filterBar}>
          <FilterInput placeholder="Titre…" value={filterTitle} onChange={setFilterTitle} />
          <FilterInput placeholder="Artiste…" value={filterArtist} onChange={setFilterArtist} />
          <FilterInput placeholder="Album…" value={filterAlbum} onChange={setFilterAlbum} />
          <FilterInput placeholder="Genre…" value={filterGenre} onChange={setFilterGenre} />
          {hasActiveFilters && (
            <button style={s.clearBtn} onClick={clearFilters}>Effacer</button>
          )}
        </div>
      )}

      {/* Body */}
      <div style={s.body}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside style={s.sidebar}>
            <p style={s.sidebarHeading}>
              {editingId !== null ? `Modifier #${editingId}` : 'Nouveau morceau'}
            </p>

            {/* Metadata toggle (add only) */}
            {editingId === null && (
              <div style={s.toggleRow}>
                <span style={s.toggleLabel}>Source des infos</span>
                <div style={s.toggleGroup}>
                  <button
                    style={{ ...s.toggleBtn, ...(useMetadata ? {} : s.toggleBtnActive) }}
                    onClick={() => setUseMetadata(false)}
                  >
                    Champs manuels
                  </button>
                  <button
                    style={{ ...s.toggleBtn, ...(useMetadata ? s.toggleBtnActive : {}) }}
                    onClick={() => setUseMetadata(true)}
                  >
                    Métadonnées fichier
                  </button>
                </div>
              </div>
            )}

            {/* Manual fields (or edit mode) */}
            {(!useMetadata || editingId !== null) && (
              <>
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
              </>
            )}

            {/* Metadata mode hint */}
            {useMetadata && editingId === null && (
              <p style={s.metaHint}>
                Les informations (titre, artiste, album, genre, année, durée) seront lues directement depuis les tags ID3 du fichier MP3.
              </p>
            )}

            {/* File drop zone (add only) */}
            {editingId === null && (
              <div
                style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
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
                <th style={{ ...s.th, width: 36 }}></th>
                <th style={{ ...s.th, width: 52 }}>ID</th>
                <th style={s.th}>Titre</th>
                <th style={s.th}>Artiste</th>
                <th style={s.th}>Album</th>
                <th style={s.th}>Genre</th>
                <th
                  style={{ ...s.th, cursor: 'pointer', userSelect: 'none', width: 80 }}
                  onClick={() => handleSort('year')}
                  title="Trier par année"
                >
                  Année <SortIcon field="year" />
                </th>
                <th
                  style={{ ...s.th, cursor: 'pointer', userSelect: 'none', width: 80 }}
                  onClick={() => handleSort('duration')}
                  title="Trier par durée"
                >
                  Durée <SortIcon field="duration" />
                </th>
                <th style={{ ...s.th, ...s.thCenter, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredTracks.length === 0 ? (
                <tr>
                  <td colSpan={9} style={s.empty}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }}>
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      <line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.5" />
                    </svg>
                    {hasActiveFilters ? 'Aucun résultat pour ces filtres' : 'Aucun fichier MP3'}
                  </td>
                </tr>
              ) : (
                filteredTracks.map(t => (
                  <tr key={t.id} style={{ ...s.tr, ...(editingId === t.id ? s.trActive : {}) }}>
                    {/* Play button */}
                    <td style={{ ...s.td, padding: '9px 6px 9px 12px', width: 36 }}>
                      {t.filePath ? (
                        <button
                          style={{ ...s.playBtn, ...(playingId === t.id ? s.playBtnActive : {}) }}
                          title={playingId === t.id ? 'Pause' : 'Écouter'}
                          onClick={() => handlePlay(t)}
                        >
                          {playingId === t.id
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          }
                        </button>
                      ) : (
                        <span style={{ display: 'inline-block', width: 24 }} />
                      )}
                    </td>
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
                      <button style={s.iconBtn} title="Paroles" onClick={() => handleViewLyrics(t)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                      <button style={s.iconBtn} title="Modifier" onClick={() => openEdit(t)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button style={{ ...s.iconBtn, ...s.iconBtnDel }} title="Supprimer" onClick={() => handleDelete(t.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
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

      {/* Lyrics Modal */}
      {lyricsModal.open && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Paroles : {lyricsModal.title}</h3>
              <button onClick={() => setLyricsModal({ ...lyricsModal, open: false })} style={s.closeModalBtn}>✕</button>
            </div>
            <div style={s.modalScrollContainer}>
              {lyricsModal.loading ? (
                <p style={{ textAlign: 'center', padding: 20, color: '#888' }}>Recherche des paroles en cours...</p>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: '#ddd' }}>
                  {lyricsModal.text}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── sub-components ─── */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={s.fieldLabel}>{label}</label>
    {children}
  </div>
);

const FilterInput: React.FC<{ placeholder: string; value: string; onChange: (v: string) => void }> = ({ placeholder, value, onChange }) => (
  <input
    style={s.filterInput}
    placeholder={placeholder}
    value={value}
    onChange={e => onChange(e.target.value)}
  />
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
    boxSizing: 'border-box', // Sécurise les calculs de taille globaux
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
  addBtnActive: {
    borderColor: 'rgba(140,180,255,0.35)',
    color: '#8cb4ff',
    background: 'rgba(140,180,255,0.06)',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px',
    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
    backgroundColor: '#0f0f0f',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  filterInput: {
    fontSize: 12,
    padding: '5px 9px',
    borderRadius: 5,
    border: '0.5px solid rgba(255,255,255,0.1)',
    background: '#1a1a1a',
    color: '#e8e6e1',
    outline: 'none',
    width: 140,
    boxSizing: 'border-box',
  },
  clearBtn: {
    fontSize: 12,
    padding: '5px 10px',
    borderRadius: 5,
    border: '0.5px solid rgba(255,100,100,0.2)',
    background: 'transparent',
    color: '#b05555',
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
    boxSizing: 'border-box',
  },
  sidebarHeading: {
    fontSize: 12,
    fontWeight: 500,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 2,
  },
  toggleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 11,
    color: '#555',
  },
  toggleGroup: {
    display: 'flex',
    borderRadius: 6,
    border: '0.5px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 500,
    border: 'none',
    background: 'transparent',
    color: '#555',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  toggleBtnActive: {
    background: 'rgba(255,255,255,0.08)',
    color: '#e8e6e1',
  },
  metaHint: {
    fontSize: 11,
    color: '#555',
    lineHeight: 1.6,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    border: '0.5px solid rgba(255,255,255,0.06)',
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
    boxSizing: 'border-box', // Évite le débordement de l'input dans la sidebar
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
  },
  tdBold: {
    fontWeight: 500,
  },
  tdMuted: {
    color: '#555',
  },
  // Corrigé : Appliqué sur un conteneur div interne au lieu du <td>
  actionsContainer: {
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
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: '#151515',
    border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    width: 500,
    maxWidth: '90%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
  },
  closeModalBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
  },
  modalScrollContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
  },
  playBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '0.5px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#666',
    transition: 'all 0.15s',
    flexShrink: 0,
  },
  playBtnActive: {
    color: '#8cb4ff',
    borderColor: 'rgba(140,180,255,0.35)',
    background: 'rgba(140,180,255,0.08)',
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