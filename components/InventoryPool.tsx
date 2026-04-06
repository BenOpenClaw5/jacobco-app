'use client';

import { motion } from 'framer-motion';
import { DisplayCard } from '@/lib/types';
import CaseCard from './CaseCard';

interface InventoryPoolProps {
  cards: DisplayCard[];
  onCardClick: (card: DisplayCard) => void;
}

function groupByType(cards: DisplayCard[]): Record<string, DisplayCard[]> {
  const groups: Record<string, DisplayCard[]> = {};
  for (const card of cards) {
    const key = card.isCustom ? '__custom__' : card.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(card);
  }
  return groups;
}

const CONTAINER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.015, delayChildren: 0.03 } },
};

export default function InventoryPool({ cards, onCardClick }: InventoryPoolProps) {
  const groups = groupByType(cards);
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === '__custom__') return 1;
    if (b === '__custom__') return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.25)' }} />
        <span
          className="text-[10px] font-light tracking-[0.28em] uppercase"
          style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-josefin)' }}
        >
          Inventory Pool
        </span>
        {cards.length > 0 && (
          <span
            className="text-[10px] font-light"
            style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--font-urbanist)' }}
          >
            {cards.length} cases
          </span>
        )}
      </div>

      {cards.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-14"
          style={{ border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '2px' }}
        >
          <div className="w-6 h-px mb-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <p
            className="text-[10px] tracking-[0.25em] uppercase font-light"
            style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}
          >
            All cases in staging
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-5"
          variants={CONTAINER_VARIANTS}
          initial="hidden"
          animate="visible"
        >
          {groupKeys.map(key => {
            const groupCards = groups[key];
            const label = key === '__custom__' ? 'Custom' : key;
            return (
              <div key={key}>
                <div
                  className="text-[9px] font-light tracking-[0.22em] uppercase mb-2"
                  style={{ color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)' }}
                >
                  {label}
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                  {groupCards.map(card => (
                    <CaseCard key={card.displayId} card={card} onClick={() => onCardClick(card)} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
