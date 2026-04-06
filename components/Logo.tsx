'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
}

export default function Logo({ size = 'md', asLink = true }: LogoProps) {
  const sizes = {
    sm: { text: 'text-base', sub: 'text-[9px]', gap: 'gap-1.5' },
    md: { text: 'text-xl', sub: 'text-[10px]', gap: 'gap-2' },
    lg: { text: 'text-3xl', sub: 'text-xs', gap: 'gap-2.5' },
  };

  const s = sizes[size];

  const content = (
    <div className={`flex items-center ${s.gap}`}>
      {/* Mark */}
      <div className="relative flex-shrink-0">
        <svg width={size === 'lg' ? 28 : size === 'md' ? 22 : 18} height={size === 'lg' ? 28 : size === 'md' ? 22 : 18} viewBox="0 0 24 24" fill="none">
          <polygon
            points="12,2 22,20 2,20"
            fill="none"
            stroke="#C4A35A"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="12" y1="8" x2="12" y2="16" stroke="#C4A35A" strokeWidth="1.2" />
          <circle cx="12" cy="17.5" r="1" fill="#C4A35A" />
        </svg>
      </div>
      {/* Wordmark */}
      <div className="flex flex-col">
        <span
          className={`${s.text} font-semibold tracking-widest uppercase leading-none`}
          style={{ color: '#F0EFE8', letterSpacing: '0.18em' }}
        >
          Jacob Co
        </span>
        <span
          className={`${s.sub} tracking-widest uppercase leading-none mt-0.5`}
          style={{ color: '#C4A35A', letterSpacing: '0.22em' }}
        >
          Event Lighting
        </span>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" className="block">
        <motion.div whileHover={{ opacity: 0.85 }} transition={{ duration: 0.15 }}>
          {content}
        </motion.div>
      </Link>
    );
  }

  return content;
}
