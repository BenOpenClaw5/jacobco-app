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
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

export default function StageColumn({ stage, cards, onCardClick }: StageColumnProps) {
  const stageColor = STAGE_COLORS[stage];

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div
        className="flex items-center gap-2.5 px-3 py-3 rounded-t-2xl mb-2"
        style={{
          background: stageColor.bg,
          borderBottom: `1px solid ${stageColor.border}`,
        }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: stageColor.dot }}
        />
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: stageColor.accent }}
        >
          {stageColor.label}
        </span>
        {cards.length > 0 && (
          <span
            className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-md"
            style={{
              background: `${stageColor.accent}18`,
              color: stageColor.accent,
            }}
          >
            {cards.length}
          </span>
        )}
      </div>

      {/* Cards */}
      <motion.div
        className="flex flex-col gap-2 flex-1"
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
      >
        {cards.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center rounded-xl min-h-16 border border-dashed"
            style={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.15)' }}
          >
            <span className="text-xs tracking-wide">Empty</span>
          </div>
        ) : (
          cards.map(card => (
            <CaseCard
              key={card.displayId}
              card={card}
              onClick={() => onCardClick(card)}
              compact
            />
          ))
        )}
      </motion.div>
    </div>
  );
}
