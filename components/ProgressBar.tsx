'use client';

import { motion } from 'framer-motion';
import { Stage, STAGE_META } from '@/lib/types';
import { STAGE_COLORS } from '@/lib/caseColors';

interface ProgressBarProps {
  cards: { stage?: Stage | null }[];
}

function computeProgress(cards: { stage?: Stage | null }[]): number {
  const stageable = cards.filter(c => c.stage); // only cards in a stage (not pool, not custom without stage)
  if (stageable.length === 0) return 0;
  const total = stageable.reduce((sum, c) => {
    return sum + (c.stage ? STAGE_META[c.stage].weight : 0);
  }, 0);
  return total / stageable.length;
}

function computeStageCounts(cards: { stage?: Stage | null }[]) {
  return {
    invoice: cards.filter(c => c.stage === 'invoice').length,
    charging: cards.filter(c => c.stage === 'charging').length,
    prepped: cards.filter(c => c.stage === 'prepped').length,
    loaded: cards.filter(c => c.stage === 'loaded').length,
    pool: cards.filter(c => !c.stage).length,
  };
}

export default function ProgressBar({ cards }: ProgressBarProps) {
  const progress = computeProgress(cards);
  const counts = computeStageCounts(cards);
  const total = cards.length;

  const stages: Stage[] = ['invoice', 'charging', 'prepped', 'loaded'];

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: progress === 100
              ? `linear-gradient(90deg, ${STAGE_COLORS.invoice.dot}, ${STAGE_COLORS.charging.dot}, ${STAGE_COLORS.prepped.dot}, ${STAGE_COLORS.loaded.dot})`
              : `linear-gradient(90deg, #C4A35A, #D4B870)`,
            boxShadow: progress > 0 ? '0 0 8px rgba(196, 163, 90, 0.4)' : 'none',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Stage counts */}
      <div className="flex items-center gap-3 flex-wrap">
        {stages.map(stage => {
          const count = counts[stage];
          const color = STAGE_COLORS[stage];
          return (
            <div key={stage} className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: count > 0 ? color.dot : 'rgba(255,255,255,0.12)' }}
              />
              <span
                className="text-xs"
                style={{ color: count > 0 ? color.dot : 'rgba(255,255,255,0.25)' }}
              >
                {color.label} <span style={{ color: 'rgba(255,255,255,0.4)' }}>{count}</span>
              </span>
            </div>
          );
        })}
        {total > 0 && (
          <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {Math.round(progress)}% complete
          </span>
        )}
        {counts.pool > 0 && (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {counts.pool} in pool
          </span>
        )}
      </div>
    </div>
  );
}
