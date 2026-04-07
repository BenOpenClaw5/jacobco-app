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
}

export default function TeamSelect({
  selected,
  onChange,
  placeholder = 'Assign team members...',
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
          borderBottom: '1px solid rgba(255,255,255,0.1)',
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
            color: 'rgba(255,255,255,0.2)',
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
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.13)',
                fontFamily: 'var(--font-josefin)',
                fontSize: '9px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              {name}
              <button
                type="button"
                onClick={e => removeChip(name, e)}
                style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.35)', padding: 0 }}
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
            color: 'rgba(255,255,255,0.2)',
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
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: '#0c1317',
            border: '1px solid rgba(255,255,255,0.1)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  fontFamily: 'var(--font-josefin)',
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  color: isSel ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  background: isSel ? 'rgba(255,255,255,0.05)' : 'transparent',
                  textAlign: 'left',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {name}
                {isSel && (
                  <Check size={12} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
