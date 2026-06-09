import React, { useState, useRef, useEffect } from 'react';

interface TagInputProps {
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    suggestions?: string[];
    variant?: 'default' | 'danger';
}

export const TagInput: React.FC<TagInputProps> = ({
    values,
    onChange,
    placeholder = 'Ajouter...',
    suggestions = [],
    variant = 'default',
}) => {
    const [input, setInput] = useState('');
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    const filtered = suggestions.filter(
        s => s.toLowerCase().includes(input.toLowerCase()) && !values.includes(s)
    );
    const showDropdown = focused && (filtered.length > 0 || input.trim().length > 0);

    const add = (val: string) => {
        const v = val.trim();
        if (v && !values.includes(v)) onChange([...values, v]);
        setInput('');
    };

    const remove = (val: string) => onChange(values.filter(v => v !== val));

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            e.preventDefault();
            add(input);
        }
        if (e.key === 'Backspace' && !input && values.length) {
            remove(values[values.length - 1]);
        }
    };

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const tagColor = variant === 'danger'
        ? { bg: 'rgba(160,50,50,0.18)', border: 'rgba(200,70,70,0.25)', text: '#c87070' }
        : { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', text: '#aaa' };

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: `0.5px solid ${focused ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                    background: '#1a1a1a',
                    cursor: 'text',
                    minHeight: 36,
                    alignItems: 'center',
                    transition: 'border-color 0.15s',
                }}
                onClick={() => inputRef.current?.focus()}
            >
                {values.map(v => (
                    <span
                        key={v}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 500,
                            background: tagColor.bg,
                            border: `0.5px solid ${tagColor.border}`,
                            color: tagColor.text,
                        }}
                    >
                        {v}
                        <button
                            onClick={e => { e.stopPropagation(); remove(v); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: tagColor.text,
                                padding: 0,
                                lineHeight: 1,
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                opacity: 0.7,
                            }}
                            aria-label={`Retirer ${v}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    onFocus={() => setFocused(true)}
                    placeholder={values.length === 0 ? placeholder : ''}
                    style={{
                        flex: 1,
                        minWidth: 80,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: '#e8e6e1',
                    }}
                />
            </div>

            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: '#1e1e1e',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    zIndex: 10,
                    overflow: 'hidden',
                    maxHeight: 180,
                    overflowY: 'auto',
                }}>
                    {filtered.map(s => (
                        <button
                            key={s}
                            onMouseDown={e => { e.preventDefault(); add(s); }}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '7px 12px',
                                fontSize: 13,
                                background: 'transparent',
                                border: 'none',
                                color: '#ccc',
                                cursor: 'pointer',
                                borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            {s}
                        </button>
                    ))}
                    {input.trim() && !suggestions.includes(input.trim()) && (
                        <button
                            onMouseDown={e => { e.preventDefault(); add(input); }}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '7px 12px',
                                fontSize: 13,
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            Ajouter «&nbsp;{input.trim()}&nbsp;»
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};