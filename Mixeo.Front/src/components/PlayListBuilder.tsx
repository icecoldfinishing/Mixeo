import React, { useState } from 'react';
import { TagInput } from './TagInput';
import {
    type PlaylistCriteria,
    EMPTY_CRITERIA,
    GENRE_SUGGESTIONS,
    LANGUAGE_SUGGESTIONS,
} from '../types/playlist';

const API_URL = 'http://localhost:5021/api/playlists';

/* ─── Section wrapper ─── */
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

/* ─── Duration pill selector ─── */
const DURATIONS = [15, 30, 45, 60, 90, 120];

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
                    onClick={() => { onChange(d); setShowCustom(false); }}
                    style={{
                        ...s.pill,
                        ...(value === d && !showCustom ? s.pillActive : {}),
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
                        onChange={e => { setCustom(e.target.value); onChange(e.target.value ? parseInt(e.target.value) : null); }}
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

/* ─── Main component ─── */
export const PlaylistBuilder: React.FC = () => {
    const [criteria, setCriteria] = useState<PlaylistCriteria>(EMPTY_CRITERIA);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

    const set = <K extends keyof PlaylistCriteria>(key: K, val: PlaylistCriteria[K]) =>
        setCriteria(prev => ({ ...prev, [key]: val }));

    const isValid = name.trim().length > 0;

    const handleGenerate = async () => {
        if (!isValid) return;
        setLoading(true);
        setStatus(null);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), criteria }),
            });
            if (res.ok) {
                setStatus({ type: 'ok', msg: 'Playlist générée avec succès.' });
                setName('');
                setCriteria(EMPTY_CRITERIA);
            } else {
                setStatus({ type: 'err', msg: 'Erreur lors de la génération.' });
            }
        } catch {
            setStatus({ type: 'err', msg: 'Impossible de joindre le serveur.' });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setCriteria(EMPTY_CRITERIA);
        setName('');
        setStatus(null);
    };

    /* summary badge count */
    const activeCriteria = [
        criteria.totalDuration,
        criteria.genres.length,
        criteria.languages.length,
        criteria.artists.length,
        criteria.excludedGenres.length,
        criteria.excludedArtists.length,
    ].filter(Boolean).length;

    return (
        <div style={s.root}>
            {/* Left column — form */}
            <div style={s.formCol}>
                <div style={s.formHeader}>
                    <div>
                        <h1 style={s.heading}>Nouvelle playlist</h1>
                        <p style={s.subheading}>Définissez les critères, le moteur sélectionne les morceaux.</p>
                    </div>
                    {activeCriteria > 0 && (
                        <span style={s.badge}>{activeCriteria} critère{activeCriteria > 1 ? 's' : ''}</span>
                    )}
                </div>

                {/* Nom */}
                <div style={s.nameRow}>
                    <label style={s.label}>Nom de la playlist *</label>
                    <input
                        style={{ ...s.input, fontSize: 15, fontWeight: 500 }}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ma playlist du soir…"
                    />
                </div>

                {/* Durée */}
                <Section
                    icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                    }
                    title="Durée totale"
                    subtitle="Durée approximative souhaitée pour la playlist"
                >
                    <DurationPicker value={criteria.totalDuration} onChange={v => set('totalDuration', v)} />
                </Section>

                {/* Inclusions */}
                <div style={s.divider}>
                    <span style={s.dividerLabel}>Inclure</span>
                </div>

                <Section
                    icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                    }
                    title="Genres"
                    subtitle="Séparer par Entrée ou virgule"
                >
                    <TagInput
                        values={criteria.genres}
                        onChange={v => set('genres', v)}
                        placeholder="Pop, Rock, Jazz…"
                        suggestions={GENRE_SUGGESTIONS}
                    />
                </Section>

                <Section
                    icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                    }
                    title="Langues"
                    subtitle="Langue des paroles souhaitée"
                >
                    <TagInput
                        values={criteria.languages}
                        onChange={v => set('languages', v)}
                        placeholder="Français, English…"
                        suggestions={LANGUAGE_SUGGESTIONS}
                    />
                </Section>

                <Section
                    icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                    }
                    title="Artistes"
                    subtitle="Privilégier ces artistes"
                >
                    <TagInput
                        values={criteria.artists}
                        onChange={v => set('artists', v)}
                        placeholder="Daft Punk, Aya Nakamura…"
                    />
                </Section>

                {/* Exclusions */}
                <div style={s.divider}>
                    <span style={{ ...s.dividerLabel, color: '#7f3030' }}>Exclure</span>
                </div>

                <Section
                    icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c87070" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                    }
                    title="Genres exclus"
                    subtitle="Ces genres ne seront pas inclus"
                >
                    <TagInput
                        values={criteria.excludedGenres}
                        onChange={v => set('excludedGenres', v)}
                        placeholder="Metal, Techno…"
                        suggestions={GENRE_SUGGESTIONS.filter(g => !criteria.genres.includes(g))}
                        variant="danger"
                    />
                </Section>

                <Section
                    icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c87070" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                    }
                    title="Artistes exclus"
                    subtitle="Ces artistes seront ignorés"
                >
                    <TagInput
                        values={criteria.excludedArtists}
                        onChange={v => set('excludedArtists', v)}
                        placeholder="Artiste à exclure…"
                        variant="danger"
                    />
                </Section>

                {/* Actions */}
                <div style={s.actions}>
                    <button
                        style={{ ...s.btnPrimary, opacity: (!isValid || loading) ? 0.5 : 1 }}
                        onClick={handleGenerate}
                        disabled={!isValid || loading}
                    >
                        {loading ? 'Génération…' : 'Générer la playlist'}
                    </button>
                    <button style={s.btnSecondary} onClick={handleReset}>
                        Réinitialiser
                    </button>
                </div>

                {status && (
                    <p style={{ fontSize: 12, color: status.type === 'ok' ? '#6aab6a' : '#c87070', marginTop: 4 }}>
                        {status.msg}
                    </p>
                )}
            </div>

            {/* Right column — summary */}
            <aside style={s.summary}>
                <p style={s.summaryHeading}>Résumé</p>

                <SummaryRow label="Durée" value={
                    criteria.totalDuration
                        ? criteria.totalDuration < 60
                            ? `${criteria.totalDuration} min`
                            : `${(criteria.totalDuration / 60).toFixed(1).replace('.0', '')}h`
                        : null
                } />
                <SummaryRow label="Genres" value={criteria.genres.join(', ') || null} />
                <SummaryRow label="Langues" value={criteria.languages.join(', ') || null} />
                <SummaryRow label="Artistes" value={criteria.artists.join(', ') || null} />

                {(criteria.excludedGenres.length > 0 || criteria.excludedArtists.length > 0) && (
                    <div style={{ marginTop: 16 }}>
                        <p style={{ ...s.summaryHeading, color: '#7f3030', marginBottom: 8 }}>Exclusions</p>
                        <SummaryRow label="Genres" value={criteria.excludedGenres.join(', ') || null} danger />
                        <SummaryRow label="Artistes" value={criteria.excludedArtists.join(', ') || null} danger />
                    </div>
                )}

                {activeCriteria === 0 && (
                    <p style={{ fontSize: 12, color: '#333', marginTop: 16, lineHeight: 1.6 }}>
                        Aucun critère défini.<br />La playlist sera générée aléatoirement.
                    </p>
                )}
            </aside>
        </div>
    );
};

const SummaryRow: React.FC<{ label: string; value: string | null; danger?: boolean }> = ({ label, value, danger }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, color: '#444', minWidth: 60, paddingTop: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: danger ? '#7f3030' : (value ? '#bbb' : '#333'), fontStyle: value ? 'normal' : 'italic', flex: 1, lineHeight: 1.5 }}>
            {value || '—'}
        </span>
    </div>
);

/* ─── Styles ─── */
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
    formCol: {
        flex: 1,
        overflowY: 'auto',
        padding: '28px 28px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        minWidth: 0,
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
        color: '#444',
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
        margin: '8px 0',
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
        color: '#444',
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
    summary: {
        width: 220,
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
};