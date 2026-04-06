'use client';

import { motion } from 'framer-motion';
import { DisplayCard, Stage } from '@/lib/types';
import { STAGE_COLORS } from '@/lib/caseColors';
import CaseCard from './CaseCard';

interface StageColumnProps {
  stage: Stage;
  cards: DisplayCard[];
  onCardClick: (card: DisplayCard) => void;
}

const CONTAINER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
};

export default function StageColumn({ stage, cards, onCardClick }: StageColumnProps) {
  const sc = STAGE_COLORS[stage];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
        <div className="flex items-center gap-2">
          <div className="w-px h-3" style={{ background: sc.accent }} />
          <span
            className="text-[10px] font-light tracking-[0.25em] uppercase"
            style={{ color: sc.accent, fontFamily: 'var(--font-josefin)' }}
          >
            {sc.label}
          </span>
        </div>
        {cards.length > 0 && (
          <span
            className="text-[10px] font-light"
            style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}
          >
            {cards.length}
          </span>
        )}
      </div>

      <motion.div
        className="flex flex-col gap-1.5 flex-1"
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
      >
        {cards.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center min-h-14 rounded-sm"
            style={{ border: '1px dashed rgba(255,255,255,0.05)' }}
          >
            <span
              className="text-[9px] tracking-[0.2em] uppercase"
              style={{ color: 'rgba(255,255,255,0.12)', fontFamily: 'var(--font-josefin)' }}
            >
              Empty
            </span>
          </div>
        ) : (
          cards.map(card => (
            <CaseCard key={card.displayId} card={card} onClick={() => onCardClick(card)} compact />
          ))
        )}
      </motion.div>
    </div>
  );
}
