'use client';

import { motion } from 'framer-motion';
import { getCaseColor } from '@/lib/caseColors';
import { DisplayCard } from '@/lib/types';
import { ImageIcon, FileTextIcon } from 'lucide-react';

interface CaseCardProps {
  card: DisplayCard;
  onClick: () => void;
  compact?: boolean;
}

export default function CaseCard({ card, onClick, compact = false }: CaseCardProps) {
  const color = getCaseColor(card.type, card.customColor);
  const hasNotes = !!(card.notes && card.notes.trim());
  const hasImages = !!(card.images && card.images.length > 0);

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left relative overflow-hidden rounded-xl cursor-pointer select-none"
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        boxShadow: `0 2px 12px ${color.glow}`,
      }}
      whileHover={{
        y: -2,
        boxShadow: `0 6px 24px ${color.glow}`,
        borderColor: color.accent + '55',
      }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
        style={{ background: color.accent }}
      />

      <div className={`pl-3.5 pr-3 ${compact ? 'py-2' : 'py-2.5'}`}>
        {/* Type label */}
        <div
          className={`font-medium leading-tight ${compact ? 'text-xs' : 'text-sm'}`}
          style={{ color: color.text }}
        >
          {card.type}
        </div>

        {/* Letter */}
        <div
          className={`font-bold leading-none mt-0.5 ${compact ? 'text-base' : 'text-lg'}`}
          style={{ color: '#F0EFE8' }}
        >
          {card.isCustom ? card.displayName : card.letter}
        </div>

        {/* Indicators */}
        {(hasNotes || hasImages) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {hasNotes && (
              <FileTextIcon size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
            )}
            {hasImages && (
              <div className="flex items-center gap-0.5">
                <ImageIcon size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {card.images!.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color.accent}08 0%, transparent 60%)`,
        }}
      />
    </motion.button>
  );
}
