import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaTrash, FaSyncAlt, FaFileAlt, FaStepForward, FaStepBackward, FaRandom, FaVolumeUp } from "react-icons/fa";
import { TagInput } from './TagInput';
import {
    type PlaylistCriteria,
    type Playlist,
    type PlaylistTrack,
    EMPTY_CRITERIA,
    GENRE_SUGGESTIONS,
    LANGUAGE_SUGGESTIONS,
} from '../types/playlist';
import { type Mp3File } from '../types/mp3';

const API_URL = 'http://localhost:5021/api/playlists';
const MP3_API_URL = 'http://localhost:5021/api/mp3';

const DURATIONS = [15, 30, 45, 60, 90, 120];

const Section: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}> = ({ icon, title, subtitle, children }) => (
    <div style={s.section}>
        <div style={s.sectionHeader}>
            <span style={s.sectionIcon}>{icon}</span>
            <div>
                <p style={s.sectionTitle}>{title}</p>
                {subtitle && <p style={s.sectionSubtitle}>{subtitle}</p>}
            </div>
        </div>
        <div style={s.sectionBody}>{children}</div>
    </div>
);

const DurationPicker: React.FC<{
    value: number | null;
    onChange: (v: number | null) => void;
}> = ({ value, onChange }) => {
    const [custom, setCustom] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {DURATIONS.map(d => (
                <button
                    key={d}
                    onClick={() => { onChange(d * 60); setShowCustom(false); }}
                    style={{
                        ...s.pill,
                        ...(value === d * 60 && !showCustom ? s.pillActive : {}),
                    }}
                >
                    {d < 60 ? `${d} min` : `${d / 60}h`}
                </button>
            ))}
            <button
                onClick={() => { setShowCustom(v => !v); if (!showCustom) onChange(null); }}
                style={{ ...s.pill, ...(showCustom ? s.pillActive : {}) }}
            >
                Personnalisé
            </button>
            {showCustom && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="number"
                        min={1}
                        max={600}
                        value={custom}
                        onChange={e => {
                            setCustom(e.target.value);
                            onChange(e.target.value ? parseInt(e.target.value) * 60 : null);
                        }}
                        placeholder="ex. 75"
                        style={{ ...s.input, width: 80 }}
                        autoFocus
                    />
                    <span style={{ fontSize: 12, color: '#555' }}>min</span>
                </div>
            )}
        </div>
    );
};

export const PlaylistBuilder: React.FC = () => {
    // Current User
    const [user] = useState<{ id: number; username: string } | null>(() => {
        const saved = localStorage.getItem('mixeo_user');
        return saved ? JSON.parse(saved) : null;
    });

    // Lists
    const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([]);
    const [allMp3s, setAllMp3s] = useState<Mp3File[]>([]);

    // Generator States
    const [criteria, setCriteria] = useState<PlaylistCriteria>(EMPTY_CRITERIA);
    const [name, setName] = useState('');
    const [previewTracks, setPreviewTracks] = useState<Mp3File[]>([]);
    const [previewDuration, setPreviewDuration] = useState(0);

    // Workspace & Operations
    const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
    const [searchTrackTerm, setSearchTrackTerm] = useState('');
    const [showAddTrackModal, setShowAddTrackModal] = useState(false);
    const [replacingTrackId, setReplacingTrackId] = useState<number | null>(null);

    // Audio Player - Full Playlist Player
    const [playerQueue, setPlayerQueue] = useState<Mp3File[]>([]);
    const [playerIndex, setPlayerIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [progress, setProgress] = useState(0);      // 0-100
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playingMp3Id = playerIndex >= 0 && playerQueue.length > 0 ? playerQueue[playerIndex]?.id ?? null : null;

    // Status UI
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

    // Lyrics Modal
    const [lyricsModal, setLyricsModal] = useState({ open: false, trackId: null as number | null, title: '', text: '', loading: false });

    useEffect(() => {
        fetchSavedPlaylists();
        fetchAllMp3Files();
    }, []);

    const fetchSavedPlaylists = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_URL}?userId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setSavedPlaylists(data);
            }
        } catch (err) {
            console.error("Error loading playlists", err);
        }
    };

    const fetchAllMp3Files = async () => {
        try {
            const res = await fetch(MP3_API_URL);
            if (res.ok) {
                const data = await res.json();
                setAllMp3s(data);
            }
        } catch (err) {
            console.error("Error loading songs", err);
        }
    };

    const set = <K extends keyof PlaylistCriteria>(key: K, val: PlaylistCriteria[K]) =>
        setCriteria(prev => ({ ...prev, [key]: val }));

    // 1. GENERATE
    const handleGenerate = async () => {
        if (!name.trim()) {
            setStatus({ type: 'err', msg: 'Veuillez saisir un nom pour la playlist.' });
            return;
        }
        setLoading(true);
        setStatus(null);
        try {
            const payload = {
                name: name.trim(),
                totalDuration: criteria.totalDuration || 3600,
                genres: criteria.genres,
                languages: criteria.languages,
                artists: criteria.artists,
                albums: criteria.albums,
                excludeArtists: criteria.excludeArtists,
                excludeGenres: criteria.excludeGenres,
                excludeAlbums: criteria.excludeAlbums,
            };

            const res = await fetch(`${API_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                setPreviewTracks(data.tracks);
                setPreviewDuration(data.totalDuration);
                setStatus({ type: 'ok', msg: 'Génération temporaire réussie. Vérifiez la liste de prévisualisation à droite puis sauvegardez.' });
            } else {
                setStatus({ type: 'err', msg: 'Erreur lors de la génération.' });
            }
        } catch {
            setStatus({ type: 'err', msg: 'Impossible de joindre le serveur.' });
        } finally {
            setLoading(false);
        }
    };

    // 2. SAVE PLAYLIST
    const handleSavePlaylist = async () => {
        if (!name.trim() || previewTracks.length === 0 || !user) return;
        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                mp3Ids: previewTracks.map(t => t.id),
                userId: user.id,
                criteria: {
                    name: name.trim(),
                    totalDuration: criteria.totalDuration || 3600,
                    genres: criteria.genres,
                    languages: criteria.languages,
                    artists: criteria.artists,
                    albums: criteria.albums,
                    excludeArtists: criteria.excludeArtists,
                    excludeGenres: criteria.excludeGenres,
                    excludeAlbums: criteria.excludeAlbums,
                }
            };

            const res = await fetch(`${API_URL}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                setStatus({ type: 'ok', msg: 'Playlist enregistrée avec succès.' });
                setName('');
                setPreviewTracks([]);
                setPreviewDuration(0);
                setCriteria(EMPTY_CRITERIA);
                fetchSavedPlaylists();
                setActivePlaylist(data);
            } else {
                setStatus({ type: 'err', msg: 'Erreur lors de la sauvegarde.' });
            }
        } catch {
            setStatus({ type: 'err', msg: 'Erreur réseau.' });
        } finally {
            setLoading(false);
        }
    };

    // 3. REMOVE TRACK

    const handleRemovePreviewTrack = (trackId: number) => {
        const track = previewTracks.find(t => t.id === trackId);
        if (track) {
            setPreviewTracks(prev => prev.filter(t => t.id !== trackId));
            setPreviewDuration(prev => prev - (track.duration || 0));
        }
    };

    // 4. ADD TRACK
    const handleAddTrack = async (playlistId: number, trackId: number) => {
        try {
            const res = await fetch(`${API_URL}/${playlistId}/add-track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackId }),
            });
            if (res.ok) {
                const updated = await res.json();
                setActivePlaylist(updated);
                setShowAddTrackModal(false);
                fetchSavedPlaylists();
            }
        } catch (err) {
            console.error("Error adding track", err);
        }
    };

    const handleAddPreviewTrack = (trackId: number) => {
        const track = allMp3s.find(t => t.id === trackId);
        if (track && !previewTracks.some(t => t.id === trackId)) {
            setPreviewTracks(prev => [...prev, track]);
            setPreviewDuration(prev => prev + (track.duration || 0));
        }
        setShowAddTrackModal(false);
    };

    // 5. REPLACE TRACK
    const handleReplaceTrack = async (playlistId: number, oldTrackId: number, newTrackId: number) => {
        try {
            const res = await fetch(`${API_URL}/${playlistId}/replace-track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldTrackId, newTrackId }),
            });
            if (res.ok) {
                const updated = await res.json();
                setActivePlaylist(updated);
                setReplacingTrackId(null);
                fetchSavedPlaylists();
            }
        } catch (err) {
            console.error("Error replacing track", err);
        }
    };

    const handleReplacePreviewTrack = (oldTrackId: number, newTrackId: number) => {
        const oldTrack = previewTracks.find(t => t.id === oldTrackId);
        const newTrack = allMp3s.find(t => t.id === newTrackId);
        if (oldTrack && newTrack) {
            setPreviewTracks(prev => prev.map(t => t.id === oldTrackId ? newTrack : t));
            setPreviewDuration(prev => prev - (oldTrack.duration || 0) + (newTrack.duration || 0));
        }
        setReplacingTrackId(null);
    };

    // 6. DELETE PLAYLIST
    const handleDeletePlaylist = async (playlistId: number) => {
        if (!window.confirm("Voulez-vous supprimer cette playlist ?")) return;
        try {
            const res = await fetch(`${API_URL}/${playlistId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setActivePlaylist(null);
                fetchSavedPlaylists();
            }
        } catch (err) {
            console.error("Error deleting playlist", err);
        }
    };

    // 7. FULL PLAYLIST PLAYER
    const getTrackList = useCallback((): Mp3File[] => {
        if (activePlaylist) return (activePlaylist.tracks || []).map(t => t.mp3File!).filter(Boolean);
        return previewTracks;
    }, [activePlaylist, previewTracks]);

    const loadTrack = useCallback((index: number, queue: Mp3File[], autoPlay = true) => {
        if (index < 0 || index >= queue.length) return;
        const track = queue[index];
        setPlayerIndex(index);
        setPlayerQueue(queue);
        if (audioRef.current) {
            audioRef.current.src = `${API_URL}/stream/${track.id}`;
            audioRef.current.playbackRate = playbackRate;
            audioRef.current.volume = volume;
            if (autoPlay) { audioRef.current.play().catch(() => {}); setIsPlaying(true); }
        }
    }, [playbackRate, volume]);

    const playTrack = useCallback((trackId: number) => {
        const queue = getTrackList();
        const idx = queue.findIndex(t => t.id === trackId);
        if (idx === -1) return;
        if (playerIndex === idx && playerQueue === queue) {
            if (audioRef.current?.paused) { audioRef.current.play(); setIsPlaying(true); }
            else { audioRef.current?.pause(); setIsPlaying(false); }
            return;
        }
        loadTrack(idx, queue);
    }, [getTrackList, playerIndex, playerQueue, loadTrack]);

    const playAll = (shuffle = false) => {
        const queue = getTrackList();
        if (!queue.length) return;
        setIsShuffle(shuffle);
        const shuffled = shuffle ? [...queue].sort(() => Math.random() - 0.5) : [...queue];
        setPlayerQueue(shuffled);
        loadTrack(0, shuffled);
    };

    const playNext = useCallback(() => {
        if (!playerQueue.length) return;
        const nextIdx = isShuffle
            ? Math.floor(Math.random() * playerQueue.length)
            : (playerIndex + 1) % playerQueue.length;
        loadTrack(nextIdx, playerQueue);
    }, [playerQueue, playerIndex, isShuffle, loadTrack]);

    const playPrev = useCallback(() => {
        if (!playerQueue.length) return;
        // If more than 3s played, restart current
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0; return;
        }
        const prevIdx = (playerIndex - 1 + playerQueue.length) % playerQueue.length;
        loadTrack(prevIdx, playerQueue);
    }, [playerQueue, playerIndex, loadTrack]);

    const handleSeek = (val: number) => {
        if (!audioRef.current || !duration) return;
        const t = (val / 100) * duration;
        audioRef.current.currentTime = t;
        setCurrentTime(t);
    };

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
        if (audioRef.current) audioRef.current.playbackRate = rate;
    };

    const handleVolumeChange = (val: number) => {
        setVolume(val);
        if (audioRef.current) audioRef.current.volume = val;
    };

    // Wire up audio events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        };
        const onLoaded = () => setDuration(audio.duration || 0);
        const onEnded = () => playNext();
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
        };
    }, [playNext]);

    const handleViewLyrics = async (file: Mp3File) => {
        if (!file.id) return;
        setLyricsModal({ open: true, trackId: file.id, title: file.title || 'Paroles', text: '', loading: true });
        try {
            const res = await fetch(`${MP3_API_URL}/${file.id}/lyrics`);
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

    // Format duration helper
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const activeCriteria = [
        criteria.totalDuration,
        criteria.genres.length,
        criteria.languages.length,
        criteria.artists.length,
        criteria.albums.length,
        criteria.excludeGenres.length,
        criteria.excludeArtists.length,
        criteria.excludeAlbums.length,
    ].filter(Boolean).length;

    return (
        <div style={s.root}>
            {/* Left sidebar: Saved Playlists */}
            <div style={s.playlistListCol}>
                <h2 style={s.sidebarHeading}>Vos Playlists</h2>
                <div style={s.playlistContainer}>
                    {savedPlaylists.map(p => (
                        <div
                            key={p.id}
                            onClick={() => {
                                setActivePlaylist(p);
                                setPreviewTracks([]);
                            }}
                            style={{
                                ...s.playlistCard,
                                ...(activePlaylist?.id === p.id ? s.playlistCardActive : {})
                            }}
                        >
                            <div style={s.playlistInfo}>
                                <span style={s.playlistName}>{p.name}</span>
                                <span style={s.playlistMeta}>
                                    {p.tracks?.length || 0} morceaux • {formatDuration(p.totalDuration)}
                                </span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePlaylist(p.id);
                                }}
                                style={s.deleteCardBtn}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {savedPlaylists.length === 0 && (
                        <p style={{ color: '#555', fontSize: 12, padding: '10px 14px' }}>Aucune playlist sauvegardée.</p>
                    )}
                </div>
            </div>

            {/* Middle panel: Form Generator OR Active Workspace */}
            <div style={s.formCol}>
                <div style={s.tabsHeader}>
                    <button
                        onClick={() => setActivePlaylist(null)}
                        style={{
                            ...s.tabBtn,
                            ...(!activePlaylist ? s.tabBtnActive : {})
                        }}
                    >
                        Créer une Playlist
                    </button>
                    {activePlaylist && (
                        <span style={s.tabSeparator}>/</span>
                    )}
                    {activePlaylist && (
                        <span style={s.activeTabName}>{activePlaylist.name}</span>
                    )}
                </div>

                {!activePlaylist ? (
                    previewTracks.length === 0 ? (
                        // Generator form
                        <div>
                        <div style={s.formHeader}>
                            <div>
                                <h1 style={s.heading}>Génération intelligente</h1>
                                <p style={s.subheading}>Sélectionnez vos filtres et laissez la magie opérer.</p>
                            </div>
                            {activeCriteria > 0 && (
                                <span style={s.badge}>{activeCriteria} critère{activeCriteria > 1 ? 's' : ''}</span>
                            )}
                        </div>

                        {/* Name Input */}
                        <div style={s.nameRow}>
                            <label style={s.label}>Nom de la playlist *</label>
                            <input
                                style={{ ...s.input, fontSize: 15, fontWeight: 500 }}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ma playlist de concentation..."
                            />
                        </div>

                        {/* Duration section */}
                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                            }
                            title="Durée totale"
                            subtitle="Durée approximative de votre sélection"
                        >
                            <DurationPicker
                                value={criteria.totalDuration}
                                onChange={v => set('totalDuration', v)}
                            />
                        </Section>

                        <div style={s.divider}>
                            <span style={s.dividerLabel}>Inclure</span>
                        </div>

                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                                </svg>
                            }
                            title="Genres"
                            subtitle="Séparer par Entrée ou virgule"
                        >
                            <TagInput
                                values={criteria.genres}
                                onChange={v => set('genres', v)}
                                placeholder="Pop, Rock, Jazz..."
                                suggestions={GENRE_SUGGESTIONS}
                            />
                        </Section>

                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                            }
                            title="Langues"
                            subtitle="Paroles dans ces langues uniquement"
                        >
                            <TagInput
                                values={criteria.languages}
                                onChange={v => set('languages', v)}
                                placeholder="Français, English..."
                                suggestions={LANGUAGE_SUGGESTIONS}
                            />
                        </Section>

                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            }
                            title="Artistes"
                            subtitle="Ajouter en priorité ces artistes"
                        >
                            <TagInput
                                values={criteria.artists}
                                onChange={v => set('artists', v)}
                                placeholder="ex: Queen, Daft Punk"
                            />
                        </Section>

                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                                </svg>
                            }
                            title="Albums"
                            subtitle="Inclure uniquement ces albums"
                        >
                            <TagInput
                                values={criteria.albums}
                                onChange={v => set('albums', v)}
                                placeholder="ex: Thriller, Nevermind..."
                            />
                        </Section>

                        <div style={s.divider}>
                            <span style={{ ...s.dividerLabel, color: '#7f3030' }}>Exclure</span>
                        </div>

                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c87070" strokeWidth="1.75" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                            }
                            title="Genres exclus"
                            subtitle="Ces styles ne figureront pas dans le résultat"
                        >
                            <TagInput
                                values={criteria.excludeGenres}
                                onChange={v => set('excludeGenres', v)}
                                placeholder="Metal, Techno..."
                                suggestions={GENRE_SUGGESTIONS.filter(g => !criteria.genres.includes(g))}
                                variant="danger"
                            />
                        </Section>

                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c87070" strokeWidth="1.75" strokeLinecap="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                            }
                            title="Artistes exclus"
                            subtitle="Ne jamais inclure ces chanteurs/groupes"
                        >
                            <TagInput
                                values={criteria.excludeArtists}
                                onChange={v => set('excludeArtists', v)}
                                placeholder="Artistes à bloquer..."
                                variant="danger"
                            />
                        </Section>

                        <Section
                            icon={
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c87070" strokeWidth="1.75" strokeLinecap="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                </svg>
                            }
                            title="Albums exclus"
                            subtitle="Ces albums seront ignorés lors de la génération"
                        >
                            <TagInput
                                values={criteria.excludeAlbums}
                                onChange={v => set('excludeAlbums', v)}
                                placeholder="Albums à bloquer..."
                                variant="danger"
                            />
                        </Section>

                        <div style={s.actions}>
                            <button
                                style={{ ...s.btnPrimary, opacity: (!name.trim() || loading) ? 0.5 : 1 }}
                                onClick={handleGenerate}
                                disabled={!name.trim() || loading}
                            >
                                {loading ? 'Recherche...' : 'Simuler la génération'}
                            </button>
                            <button style={s.btnSecondary} onClick={() => {
                                setCriteria(EMPTY_CRITERIA);
                                setName('');
                                setPreviewTracks([]);
                                setPreviewDuration(0);
                                setStatus(null);
                            }}>
                                Réinitialiser
                            </button>
                        </div>

                        {status && (
                            <div style={{
                                ...s.statusCard,
                                borderLeft: status.type === 'ok' ? '3px solid #6aab6a' : '3px solid #ef4444'
                            }}>
                                {status.msg}
                            </div>
                        )}
                    </div>
                    ) : (
                        // Workspace for PREVIEW playlist
                        <div>
                            <div style={s.activePlaylistHeader}>
                                <div>
                                    <h1 style={s.heading}>Prévisualisation : {name}</h1>
                                    <p style={s.subheading}>
                                        Non sauvegardée • {previewTracks.length} musiques • {formatDuration(previewDuration)}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <button onClick={() => playAll(false)} style={s.btnAccent} title="Lecture dans l'ordre">
                                        ▶ Lire tout
                                    </button>
                                    <button onClick={() => playAll(true)} style={{ ...s.btnAccent, background: 'rgba(255,200,0,0.1)', borderColor: 'rgba(255,200,0,0.3)', color: '#f0c040' }} title="Lecture aléatoire">
                                        ⇄ Shuffle
                                    </button>
                                    <button onClick={() => setShowAddTrackModal(true)} style={s.btnSecondary}>
                                        + Ajouter
                                    </button>
                                    <button onClick={handleSavePlaylist} style={s.btnPrimary}>
                                        Sauvegarder
                                    </button>
                                    <button onClick={() => setPreviewTracks([])} style={{ ...s.btnSecondary, color: '#888' }}>
                                        Annuler
                                    </button>
                                </div>
                            </div>

                            <div style={s.tracksTable}>
                                <div style={s.tableHeader}>
                                    <div style={{ flex: 2 }}>Titre</div>
                                    <div style={{ flex: 1.5 }}>Artiste</div>
                                    <div style={{ flex: 1.5 }}>Album</div>
                                    <div style={{ flex: 1 }}>Genre</div>
                                    <div style={{ flex: 0.8 }}>Langue</div>
                                    <div style={{ flex: 0.6 }}>Année</div>
                                    <div style={{ flex: 0.6 }}>Durée</div>
                                    <div style={{ width: 100, textAlign: 'right' }}>Actions</div>
                                </div>

                                {previewTracks.map((file) => {
                                    const isPlaying = playingMp3Id === file.id;

                                    return (
                                        <div key={file.id} style={{ ...s.tableRow, ...(isPlaying ? { backgroundColor: 'rgba(255, 255, 255, 0.03)' } : {}) }}>
                                            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <button onClick={() => playTrack(file.id)} style={s.playBtnSmall}>
                                                    {isPlaying ? <FaPause /> : <FaPlay />}
                                                </button>
                                                <span style={{ fontWeight: 500, color: isPlaying ? '#e8e6e1' : '#ccc' }}>
                                                    {file.title || 'Inconnu'}
                                                </span>
                                            </div>
                                            <div style={{ flex: 1.5, color: '#aaa' }}>{file.artist || '—'}</div>
                                            <div style={{ flex: 1.5, color: '#888' }}>{file.album || '—'}</div>
                                            <div style={{ flex: 1, color: '#888' }}>{file.genre || '—'}</div>
                                            <div style={{ flex: 0.8, color: '#888' }}>{file.language || '—'}</div>
                                            <div style={{ flex: 0.6, color: '#888' }}>{file.year || '—'}</div>
                                            <div style={{ flex: 0.6, color: '#aaa' }}>{formatDuration(file.duration || 0)}</div>

                                            <div style={{ width: 100, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                <button onClick={() => handleViewLyrics(file)} title="Voir les paroles" style={s.iconActionBtn}>
                                                    <FaFileAlt />
                                                </button>
                                                <button onClick={() => setReplacingTrackId(file.id)} title="Remplacer le morceau" style={s.iconActionBtn}>
                                                    <FaSyncAlt />
                                                </button>
                                                <button onClick={() => handleRemovePreviewTrack(file.id)} title="Supprimer de la prévisualisation" style={s.iconActionBtnDanger}>
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {previewTracks.length === 0 && (
                                    <p style={{ color: '#555', textAlign: 'center', padding: '40px 0' }}>
                                        Aucun morceau trouvé. Modifiez vos critères et réessayez.
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    // Workspace for active playlist
                    <div>
                        <div style={s.activePlaylistHeader}>
                            <div>
                                <h1 style={s.heading}>{activePlaylist.name}</h1>
                                <p style={s.subheading}>
                                    Sauvegardée • {activePlaylist.tracks?.length || 0} musiques • {formatDuration(activePlaylist.totalDuration)}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button onClick={() => playAll(false)} style={s.btnAccent} title="Lecture dans l'ordre">
                                    ▶ Lire tout
                                </button>
                                <button onClick={() => playAll(true)} style={{ ...s.btnAccent, background: 'rgba(255,200,0,0.1)', borderColor: 'rgba(255,200,0,0.3)', color: '#f0c040' }} title="Lecture aléatoire">
                                    ⇄ Shuffle
                                </button>
                                <a
                                    href={`${API_URL}/${activePlaylist.id}/download-zip`}
                                    style={s.btnPrimaryLink}
                                >
                                    ↓ Télécharger ZIP
                                </a>
                            </div>
                        </div>

                        {/* Tracks list */}
                        <div style={s.tracksTable}>
                            <div style={s.tableHeader}>
                                <div style={{ flex: 2 }}>Titre</div>
                                <div style={{ flex: 1.5 }}>Artiste</div>
                                <div style={{ flex: 1.5 }}>Album</div>
                                <div style={{ flex: 1 }}>Genre</div>
                                <div style={{ flex: 0.8 }}>Langue</div>
                                <div style={{ flex: 0.6 }}>Année</div>
                                <div style={{ flex: 0.6 }}>Durée</div>
                                <div style={{ width: 100, textAlign: 'right' }}>Actions</div>
                            </div>

                            {activePlaylist.tracks?.map((t: PlaylistTrack) => {
                                const file = t.mp3File;
                                if (!file) return null;
                                const isPlaying = playingMp3Id === file.id;

                                return (
                                    <div
                                        key={t.id}
                                        style={{
                                            ...s.tableRow,
                                            ...(isPlaying ? { backgroundColor: 'rgba(255, 255, 255, 0.03)' } : {})
                                        }}
                                    >
                                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <button
                                                onClick={() => playTrack(file.id)}
                                                style={s.playBtnSmall}
                                            >
                                                {isPlaying ? <FaPause /> : <FaPlay />}
                                            </button>
                                            <span style={{ fontWeight: 500, color: isPlaying ? '#e8e6e1' : '#ccc' }}>
                                                {file.title || 'Inconnu'}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1.5, color: '#aaa' }}>{file.artist || '—'}</div>
                                        <div style={{ flex: 1.5, color: '#888' }}>{file.album || '—'}</div>
                                        <div style={{ flex: 1, color: '#888' }}>{file.genre || '—'}</div>
                                        <div style={{ flex: 0.8, color: '#888' }}>{file.language || '—'}</div>
                                        <div style={{ flex: 0.6, color: '#888' }}>{file.year || '—'}</div>
                                        <div style={{ flex: 0.6, color: '#aaa' }}>{formatDuration(file.duration || 0)}</div>

                                        <div style={{ width: 100, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                            <button
                                                onClick={() => handleViewLyrics(file)}
                                                title="Voir les paroles"
                                                style={s.iconActionBtn}
                                            >
                                                <FaFileAlt />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {(!activePlaylist.tracks || activePlaylist.tracks.length === 0) && (
                                <p style={{ color: '#555', textAlign: 'center', padding: '40px 0' }}>
                                    Aucun morceau dans cette playlist.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right sidebar: Interactive Preview Generator OR Replacer Panel */}
            <aside style={s.summary}>
                {replacingTrackId ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <p style={s.summaryHeading}>Remplacer par...</p>
                            <button
                                onClick={() => setReplacingTrackId(null)}
                                style={s.closeTextBtn}
                            >
                                Annuler
                            </button>
                        </div>
                        <p style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
                            Sélectionnez la chanson de substitution :
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {allMp3s
                                .filter(m => activePlaylist ? !activePlaylist.tracks?.some(pt => pt.mp3File?.id === m.id) : !previewTracks.some(pt => pt.id === m.id))
                                .map(m => (
                                    <div
                                        key={m.id}
                                        onClick={() => activePlaylist ? handleReplaceTrack(activePlaylist.id, replacingTrackId, m.id) : handleReplacePreviewTrack(replacingTrackId, m.id)}
                                        style={s.compactSongCard}
                                    >
                                        <span style={{ fontWeight: 500, display: 'block', fontSize: 12 }}>{m.title}</span>
                                        <span style={{ fontSize: 10, color: '#888' }}>{m.artist} • {m.genre || 'Sans style'}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                ) : !activePlaylist && previewTracks.length > 0 ? (
                    <div>
                        <p style={s.summaryHeading}>Prévisualisation ({previewTracks.length})</p>
                        <div style={{ marginBottom: 15 }}>
                            <SummaryRow label="Durée Totale" value={formatDuration(previewDuration)} />
                        </div>
                        <p style={{ fontSize: 11, color: '#555', marginTop: 20 }}>
                            Modifiez votre playlist dans le panneau central (Ajout, Remplacement, Suppression) avant de la sauvegarder.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p style={s.summaryHeading}>Filtres appliqués</p>
                        <SummaryRow label="Durée max" value={
                            criteria.totalDuration
                                ? criteria.totalDuration < 60
                                    ? `${criteria.totalDuration} sec`
                                    : `${(criteria.totalDuration / 60).toFixed(0)} min`
                                : '—'
                        } />
                        <SummaryRow label="Genres" value={criteria.genres.join(', ') || null} />
                        <SummaryRow label="Langues" value={criteria.languages.join(', ') || null} />
                        <SummaryRow label="Artistes" value={criteria.artists.join(', ') || null} />

                        {(criteria.excludeGenres.length > 0 || criteria.excludeArtists.length > 0) && (
                            <div style={{ marginTop: 20 }}>
                                <p style={{ ...s.summaryHeading, color: '#7f3030', marginBottom: 8 }}>Exclusions</p>
                                <SummaryRow label="Genres" value={criteria.excludeGenres.join(', ') || null} danger />
                                <SummaryRow label="Artistes" value={criteria.excludeArtists.join(', ') || null} danger />
                            </div>
                        )}

                        {activeCriteria === 0 && (
                            <p style={{ fontSize: 11, color: '#444', marginTop: 16, lineHeight: 1.6 }}>
                                Aucun critère défini.<br />Génération entièrement aléatoire.
                            </p>
                        )}
                    </div>
                )}
            </aside>

            {/* Modal: Add Track Manually */}
            {showAddTrackModal && (
                <div style={s.modalOverlay}>
                    <div style={s.modalContent}>
                        <div style={s.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>Ajouter un morceau</h3>
                            <button
                                onClick={() => {
                                    setShowAddTrackModal(false);
                                    setSearchTrackTerm('');
                                }}
                                style={s.closeModalBtn}
                            >
                                ✕
                            </button>
                        </div>
                        <input
                            type="text"
                            value={searchTrackTerm}
                            onChange={(e) => setSearchTrackTerm(e.target.value)}
                            style={s.modalSearchInput}
                            placeholder="Rechercher par titre, artiste, genre..."
                        />
                        <div style={s.modalScrollContainer}>
                            {allMp3s
                                .filter(m => activePlaylist ? !activePlaylist.tracks?.some(pt => pt.mp3File?.id === m.id) : !previewTracks.some(pt => pt.id === m.id))
                                .filter(m => {
                                    const term = searchTrackTerm.toLowerCase();
                                    return (
                                        (m.title?.toLowerCase() || '').includes(term) ||
                                        (m.artist?.toLowerCase() || '').includes(term) ||
                                        (m.genre?.toLowerCase() || '').includes(term)
                                    );
                                })
                                .map(m => (
                                    <div key={m.id} style={s.modalTrackRow}>
                                        <div>
                                            <span style={{ fontWeight: 500, fontSize: 13, display: 'block' }}>{m.title}</span>
                                            <span style={{ fontSize: 11, color: '#888' }}>{m.artist} • {m.album || 'Sans album'}</span>
                                        </div>
                                        <button
                                            onClick={() => activePlaylist ? handleAddTrack(activePlaylist.id, m.id) : handleAddPreviewTrack(m.id)}
                                            style={s.addTrackConfirmBtn}
                                        >
                                            Ajouter
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

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

            {/* Persistent hidden audio element */}
            <audio ref={audioRef} style={{ display: 'none' }} />

            {/* Floating Player Bar */}
            {playerQueue.length > 0 && (
                <div style={s.playerBar}>
                    {/* Track Info */}
                    <div style={s.playerTrackInfo}>
                        <span style={s.playerTitle}>{playerQueue[playerIndex]?.title || 'Lecture...'}</span>
                        <span style={s.playerArtist}>{playerQueue[playerIndex]?.artist || ''}</span>
                    </div>

                    {/* Controls */}
                    <div style={s.playerControls}>
                        {/* Shuffle */}
                        <button
                            onClick={() => setIsShuffle(v => !v)}
                            style={{ ...s.playerBtn, color: isShuffle ? '#f0c040' : '#555' }}
                            title="Shuffle"
                        >
                            <FaRandom />
                        </button>

                        {/* Prev */}
                        <button onClick={playPrev} style={s.playerBtn} title="Précédent">
                            <FaStepBackward />
                        </button>

                        {/* Play/Pause */}
                        <button
                            onClick={() => {
                                if (!audioRef.current) return;
                                if (isPlaying) { audioRef.current.pause(); }
                                else { audioRef.current.play().catch(() => {}); }
                            }}
                            style={s.playerPlayBtn}
                        >
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </button>

                        {/* Next */}
                        <button onClick={playNext} style={s.playerBtn} title="Suivant">
                            <FaStepForward />
                        </button>
                    </div>

                    {/* Progress */}
                    <div style={s.playerProgress}>
                        <span style={s.playerTime}>{formatDuration(currentTime)}</span>
                        <input
                            type="range" min={0} max={100} step={0.1}
                            value={progress}
                            onChange={e => handleSeek(Number(e.target.value))}
                            style={s.playerSeek}
                        />
                        <span style={s.playerTime}>{formatDuration(duration)}</span>
                    </div>

                    {/* Speed + Volume */}
                    <div style={s.playerRight}>
                        {/* Speed */}
                        <select
                            value={playbackRate}
                            onChange={e => handleSpeedChange(Number(e.target.value))}
                            style={s.playerSelect}
                            title="Vitesse"
                        >
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                                <option key={r} value={r}>{r}x</option>
                            ))}
                        </select>

                        {/* Volume */}
                        <FaVolumeUp style={{ color: '#555', fontSize: 11, flexShrink: 0 }} />
                        <input
                            type="range" min={0} max={1} step={0.05}
                            value={volume}
                            onChange={e => handleVolumeChange(Number(e.target.value))}
                            style={{ ...s.playerSeek, width: 70 }}
                        />

                        {/* Queue position */}
                        <span style={s.playerTime}>{playerIndex + 1}/{playerQueue.length}</span>

                        {/* Close player */}
                        <button
                            onClick={() => {
                                audioRef.current?.pause();
                                setPlayerQueue([]);
                                setPlayerIndex(-1);
                                setIsPlaying(false);
                            }}
                            style={{ ...s.playerBtn, color: '#555', fontSize: 12 }}
                            title="Fermer le lecteur"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryRow: React.FC<{ label: string; value: string | null; danger?: boolean }> = ({ label, value, danger }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, color: '#444', minWidth: 70, paddingTop: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: danger ? '#7f3030' : (value ? '#bbb' : '#333'), fontStyle: value ? 'normal' : 'italic', flex: 1, lineHeight: 1.5 }}>
            {value || '—'}
        </span>
    </div>
);

const s: Record<string, React.CSSProperties> = {
    root: {
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 13,
        backgroundColor: '#0d0d0d',
        color: '#e8e6e1',
    },
    playlistListCol: {
        width: 250,
        flexShrink: 0,
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#090909',
    },
    sidebarHeading: {
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: '#555',
        padding: '20px 20px 10px',
        margin: 0,
    },
    playlistContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '0 10px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    playlistCard: {
        padding: '12px 14px',
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.04)',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.15s',
    },
    playlistCardActive: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderColor: 'rgba(255,255,255,0.15)',
    },
    playlistInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
        flex: 1,
    },
    playlistName: {
        fontSize: 13,
        fontWeight: 500,
        color: '#e8e6e1',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    playlistMeta: {
        fontSize: 11,
        color: '#666',
    },
    deleteCardBtn: {
        background: 'none',
        border: 'none',
        color: '#444',
        fontSize: 12,
        cursor: 'pointer',
        padding: '4px',
        lineHeight: 1,
        transition: 'color 0.15s',
    },
    formCol: {
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        minWidth: 0,
        backgroundColor: '#0c0c0c',
    },
    tabsHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
    },
    tabBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        padding: '4px 0',
    },
    tabBtnActive: {
        color: '#e8e6e1',
        borderBottom: '2px solid #e8e6e1',
    },
    tabSeparator: {
        color: '#333',
        fontSize: 13,
    },
    activeTabName: {
        color: '#888',
        fontSize: 13,
        fontWeight: 500,
    },
    formHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    heading: {
        fontSize: 18,
        fontWeight: 500,
        color: '#e8e6e1',
        letterSpacing: '-0.01em',
        margin: 0,
    },
    subheading: {
        fontSize: 12,
        color: '#555',
        marginTop: 4,
        margin: '4px 0 0',
    },
    badge: {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 500,
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        color: '#888',
    },
    nameRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginBottom: 24,
    },
    label: {
        fontSize: 11,
        color: '#555',
        fontWeight: 400,
    },
    input: {
        fontSize: 13,
        padding: '7px 10px',
        borderRadius: 6,
        border: '0.5px solid rgba(255,255,255,0.1)',
        background: '#1a1a1a',
        color: '#e8e6e1',
        outline: 'none',
        width: '100%',
    },
    divider: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '8px 0 16px',
    },
    dividerLabel: {
        fontSize: 11,
        fontWeight: 500,
        color: '#444',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 8,
    },
    sectionIcon: {
        color: '#555',
        marginTop: 1,
        flexShrink: 0,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 500,
        color: '#ccc',
        margin: 0,
    },
    sectionSubtitle: {
        fontSize: 11,
        color: '#555',
        margin: '2px 0 0',
    },
    sectionBody: {
        paddingLeft: 25,
    },
    pill: {
        padding: '5px 13px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 500,
        border: '0.5px solid rgba(255,255,255,0.1)',
        background: 'transparent',
        color: '#666',
        cursor: 'pointer',
        transition: 'all 0.12s',
    },
    pillActive: {
        background: 'rgba(255,255,255,0.08)',
        border: '0.5px solid rgba(255,255,255,0.2)',
        color: '#e8e6e1',
    },
    actions: {
        display: 'flex',
        gap: 10,
        marginTop: 8,
        paddingTop: 16,
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
    },
    btnPrimary: {
        flex: 1,
        padding: '9px',
        fontSize: 13,
        fontWeight: 500,
        borderRadius: 6,
        border: 'none',
        background: '#e8e6e1',
        color: '#0d0d0d',
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'none',
        transition: 'opacity 0.15s',
    },
    btnPrimaryLink: {
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 500,
        borderRadius: 6,
        border: 'none',
        background: '#e8e6e1',
        color: '#0d0d0d',
        cursor: 'pointer',
        textAlign: 'center',
        textDecoration: 'none',
        transition: 'opacity 0.15s',
    },
    btnSecondary: {
        padding: '9px 16px',
        fontSize: 13,
        borderRadius: 6,
        border: '0.5px solid rgba(255,255,255,0.1)',
        background: 'transparent',
        color: '#555',
        cursor: 'pointer',
    },
    btnAccent: {
        padding: '9px 16px',
        fontSize: 13,
        fontWeight: 500,
        borderRadius: 6,
        border: '0.5px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.05)',
        color: '#e8e6e1',
        cursor: 'pointer',
    },
    statusCard: {
        marginTop: 15,
        padding: '10px 14px',
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.02)',
        fontSize: 12,
        lineHeight: 1.5,
    },
    activePlaylistHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 15,
        borderBottom: '0.5px solid rgba(255,255,255,0.06)'
    },
    tracksTable: {
        display: 'flex',
        flexDirection: 'column',
    },
    tableHeader: {
        display: 'flex',
        padding: '10px 12px',
        color: '#555',
        fontWeight: 500,
        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    tableRow: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        borderBottom: '0.5px solid rgba(255,255,255,0.03)',
        transition: 'background-color 0.15s',
    },
    playBtnSmall: {
        background: 'none',
        border: 'none',
        color: '#aaa',
        fontSize: 13,
        cursor: 'pointer',
        padding: '2px 6px',
        lineHeight: 1,
    },
    iconActionBtn: {
        background: 'none',
        border: 'none',
        color: '#555',
        cursor: 'pointer',
        fontSize: 13,
        padding: '4px',
    },
    iconActionBtnDanger: {
        background: 'none',
        border: 'none',
        color: '#833',
        cursor: 'pointer',
        fontSize: 13,
        padding: '4px',
    },
    summary: {
        width: 260,
        flexShrink: 0,
        borderLeft: '0.5px solid rgba(255,255,255,0.06)',
        padding: '28px 20px',
        overflowY: 'auto',
        backgroundColor: '#0d0d0d',
    },
    summaryHeading: {
        fontSize: 11,
        fontWeight: 500,
        color: '#444',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: 14,
        margin: '0 0 14px',
    },
    previewListScroll: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: 400,
        overflowY: 'auto',
    },
    previewTrackRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 8,
        borderBottom: '0.5px solid rgba(255,255,255,0.03)',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(3px)',
    },
    modalContent: {
        width: 450,
        backgroundColor: '#111',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeModalBtn: {
        background: 'none',
        border: 'none',
        color: '#888',
        cursor: 'pointer',
        fontSize: 14,
    },
    modalSearchInput: {
        padding: '8px 12px',
        borderRadius: 6,
        border: '0.5px solid rgba(255,255,255,0.15)',
        background: '#1a1a1a',
        color: '#fff',
        outline: 'none',
        fontSize: 13,
    },
    modalScrollContainer: {
        maxHeight: 250,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    modalTrackRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 10px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 6,
        border: '0.5px solid rgba(255,255,255,0.04)',
    },
    addTrackConfirmBtn: {
        padding: '4px 10px',
        fontSize: 11,
        borderRadius: 4,
        border: 'none',
        backgroundColor: '#e8e6e1',
        color: '#0d0d0d',
        fontWeight: 500,
        cursor: 'pointer',
    },
    compactSongCard: {
        padding: '8px 10px',
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
    },
    closeTextBtn: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: 11,
        cursor: 'pointer',
        textDecoration: 'underline',
    },

    // ─── FLOATING PLAYER BAR ────────────────────────────────────────────────
    playerBar: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        background: 'rgba(10,10,10,0.97)',
        borderTop: '0.5px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 20px',
        zIndex: 500,
        boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
    },
    playerTrackInfo: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 140,
        maxWidth: 200,
        overflow: 'hidden',
        flexShrink: 0,
    },
    playerTitle: {
        fontSize: 12,
        fontWeight: 600,
        color: '#e8e6e1',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    playerArtist: {
        fontSize: 10,
        color: '#666',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    playerControls: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    playerBtn: {
        background: 'transparent',
        border: 'none',
        color: '#777',
        cursor: 'pointer',
        fontSize: 13,
        padding: '6px 8px',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        transition: 'color 0.15s',
    },
    playerPlayBtn: {
        background: '#e8e6e1',
        border: 'none',
        color: '#0d0d0d',
        cursor: 'pointer',
        fontSize: 13,
        width: 34,
        height: 34,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    playerProgress: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 120,
    },
    playerSeek: {
        flex: 1,
        height: 3,
        appearance: 'none' as const,
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        cursor: 'pointer',
        accentColor: '#e8e6e1',
    },
    playerTime: {
        fontSize: 10,
        color: '#555',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    playerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    playerSelect: {
        background: 'transparent',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 4,
        color: '#777',
        fontSize: 11,
        padding: '2px 6px',
        cursor: 'pointer',
    },
};