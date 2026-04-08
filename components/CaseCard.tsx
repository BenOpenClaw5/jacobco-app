'use client';

import { getCaseColor } from '@/lib/caseColors';
import { DisplayCard } from '@/lib/types';

interface CaseCardProps {
  card: DisplayCard;
  onClick: () => void;
  compact?: boolean;
}

export default function CaseCard({ card, onClick, compact = false }: CaseCardProps) {
  const color = getCaseColor(card.type, card.customColor);
  const hasNotes = !!(card.notes && card.notes.trim());
  const hasImages = !!(card.images && card.images.length > 0);
  const hasToolsWarning = card.type === 'Tools' && card.has_tools_warning;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left relative overflow-hidden rounded-sm cursor-pointer select-none"
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        transition: 'opacity 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '1';
      }}
    >
      {/* Left accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{ background: color.accent, opacity: 0.7 }}
      />

      {/* Amber tools warning dot */}
      {hasToolsWarning && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'rgba(220,150,50,0.9)',
            flexShrink: 0,
          }}
        />
      )}

      <div className={`pl-3.5 pr-3 ${compact ? 'py-2' : 'py-2.5'}`}>
        <div
          className="text-[10px] font-light tracking-[0.18em] uppercase leading-none truncate"
          style={{ color: color.text, fontFamily: 'var(--font-josefin)' }}
        >
          {card.type}
        </div>
        <div
          className={`font-light leading-none mt-1 tracking-wide ${compact ? 'text-sm' : 'text-base'}`}
          style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
        >
          {card.isCustom ? card.displayName : card.letter}
        </div>

        {(hasNotes || hasImages) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {hasNotes && (
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            )}
            {hasImages && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <span className="text-[9px] font-light" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>
                  {card.images!.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
