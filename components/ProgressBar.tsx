'use client';

import { motion } from 'framer-motion';
import { Stage, STAGE_META } from '@/lib/types';
import { STAGE_COLORS } from '@/lib/caseColors';

interface ProgressBarProps {
  cards: { stage?: Stage | null }[];
}

function computeProgress(cards: { stage?: Stage | null }[]): number {
  const stageable = cards.filter(c => c.stage);
  if (stageable.length === 0) return 0;
  const total = stageable.reduce((sum, c) => sum + (c.stage ? STAGE_META[c.stage].weight : 0), 0);
  return total / stageable.length;
}

export default function ProgressBar({ cards }: ProgressBarProps) {
  const progress = computeProgress(cards);
  const stages: Stage[] = ['invoice', 'charging', 'prepped', 'loaded'];
  const counts = {
    invoice: cards.filter(c => c.stage === 'invoice').length,
    charging: cards.filter(c => c.stage === 'charging').length,
    prepped: cards.filter(c => c.stage === 'prepped').length,
    loaded: cards.filter(c => c.stage === 'loaded').length,
    pool: cards.filter(c => !c.stage).length,
  };

  return (
    <div className="space-y-3">
      {/* Track */}
      <div className="relative h-px w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{ background: '#ffffff' }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Stage pills */}
      <div className="flex items-center gap-4 flex-wrap">
        {stages.map(stage => {
          const count = counts[stage];
          const sc = STAGE_COLORS[stage];
          return (
            <div key={stage} className="flex items-center gap-1.5">
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: count > 0 ? sc.dot : 'rgba(255,255,255,0.12)' }}
              />
              <span
                className="text-[10px] tracking-[0.18em] uppercase font-light"
                style={{
                  color: count > 0 ? sc.accent : 'rgba(255,255,255,0.2)',
                  fontFamily: 'var(--font-josefin)',
                }}
              >
                {sc.label}
                {count > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>{count}</span>
                )}
              </span>
            </div>
          );
        })}
        <span
          className="ml-auto text-[10px] font-light tracking-widest"
          style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
