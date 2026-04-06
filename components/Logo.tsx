'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
}

export default function Logo({ size = 'md', asLink = true }: LogoProps) {
  const configs = {
    sm: { markSize: 16, wordmark: 'text-sm', sub: 'text-[8px]', gap: 'gap-2.5' },
    md: { markSize: 20, wordmark: 'text-base', sub: 'text-[9px]', gap: 'gap-3' },
    lg: { markSize: 26, wordmark: 'text-2xl', sub: 'text-[10px]', gap: 'gap-3.5' },
  };
  const c = configs[size];

  const content = (
    <div className={`flex items-center ${c.gap}`}>
      {/* Geometric mark — two interlocked thin lines forming a J/C crosshair */}
      <svg width={c.markSize} height={c.markSize} viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <rect x="1" y="11.5" width="22" height="1" fill="white" opacity="0.9" />
        <rect x="11.5" y="1" width="1" height="22" fill="white" opacity="0.9" />
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.7" />
        <circle cx="12" cy="12" r="1" fill="white" opacity="0.9" />
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col justify-center">
        <span
          className={`${c.wordmark} font-light tracking-[0.25em] uppercase leading-none`}
          style={{ fontFamily: 'var(--font-josefin)', color: '#ffffff' }}
        >
          Jacob Co
        </span>
        <span
          className={`${c.sub} tracking-[0.3em] uppercase leading-none mt-1`}
          style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}
        >
          Event Lighting
        </span>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link href="/" className="block">
        <motion.div whileHover={{ opacity: 0.7 }} transition={{ duration: 0.2 }}>
          {content}
        </motion.div>
      </Link>
    );
  }

  return content;
}
