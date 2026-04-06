'use client';

import { motion } from 'framer-motion';
import { DisplayCard } from '@/lib/types';
import CaseCard from './CaseCard';
import { Package } from 'lucide-react';

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
  visible: { transition: { staggerChildren: 0.02, delayChildren: 0.05 } },
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Package size={15} style={{ color: 'rgba(255,255,255,0.25)' }} />
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Inventory Pool
        </span>
        {cards.length > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
          >
            {cards.length}
          </span>
        )}
      </div>

      {cards.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}
        >
          <Package size={32} style={{ color: 'rgba(255,255,255,0.08)' }} />
          <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.18)' }}>
            All cases are in staging
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={CONTAINER_VARIANTS}
          initial="hidden"
          animate="visible"
        >
          {groupKeys.map(groupKey => {
            const groupCards = groups[groupKey];
            const label = groupKey === '__custom__' ? 'Custom' : groupKey;
            return (
              <div key={groupKey}>
                <div
                  className="text-[10px] font-medium tracking-widest uppercase mb-2 px-0.5"
                  style={{ color: 'rgba(255,255,255,0.18)' }}
                >
                  {label}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {groupCards.map(card => (
                    <CaseCard
                      key={card.displayId}
                      card={card}
                      onClick={() => onCardClick(card)}
                      compact
                    />
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
