'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export const TEAM_MEMBERS = [
  'Abby', 'Ben', 'Courtney', 'Drew', 'Eden', 'Gus',
  'Jacob', 'Jace', 'Joseph', 'Max', 'Mia', 'Tommy', 'Van',
];

interface TeamSelectProps {
  selected: string[];
  onChange: (members: string[]) => void;
  placeholder?: string;
  openUp?: boolean;
}

export default function TeamSelect({
  selected,
  onChange,
  placeholder = 'Assign team members...',
  openUp = false,
}: TeamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  function toggle(name: string) {
    onChange(
      selected.includes(name)
        ? selected.filter(n => n !== name)
        : [...selected, name],
    );
  }

  function removeChip(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter(n => n !== name));
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger field */}
      <div
        onClick={() => setIsOpen(v => !v)}
        style={{
          borderBottom: '1px solid var(--border)',
          paddingBottom: '10px',
          cursor: 'pointer',
          minHeight: '34px',
          display: 'flex',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '5px',
        }}
      >
        {selected.length === 0 ? (
          <span style={{
            fontFamily: 'var(--font-urbanist)',
            fontWeight: 200,
            fontSize: '14px',
            color: 'var(--text-dim)',
            letterSpacing: '0.01em',
            lineHeight: '20px',
          }}>
            {placeholder}
          </span>
        ) : (
          selected.map(name => (
            <span
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 7px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-josefin)',
                fontSize: '9px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}
            >
              {name}
              <button
                type="button"
                onClick={e => removeChip(name, e)}
                style={{ display: 'flex', alignItems: 'center', color: 'var(--text-dim)', padding: 0 }}
              >
                <X size={9} strokeWidth={2} />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            color: 'var(--text-dim)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
            marginTop: '4px',
          }}
        />
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(openUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            maxHeight: '280px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {TEAM_MEMBERS.map(name => {
            const isSel = selected.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0 16px',
                  minHeight: '44px',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-josefin)',
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: isSel ? 'var(--surface)' : 'transparent',
                  textAlign: 'left',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {name}
                {isSel && (
                  <Check size={12} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
