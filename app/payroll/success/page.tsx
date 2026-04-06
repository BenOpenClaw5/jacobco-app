'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { ChevronLeft } from 'lucide-react';

export default function PayrollSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#070c0e' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-4 px-5 py-4"
        style={{
          background: 'rgba(7,12,14,0.96)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Link href="/payroll" className="flex items-center gap-1.5 transition-opacity hover:opacity-50">
          <ChevronLeft size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </Link>
        <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <Logo size="sm" asLink={false} />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-sm w-full"
        >
          {/* Subtle decorative line */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div
            className="text-[9px] tracking-[0.4em] uppercase font-light mb-5"
            style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}
          >
            Submitted
          </div>

          <h1
            className="text-3xl font-light tracking-[0.06em] mb-4"
            style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
          >
            All Set
          </h1>

          <p
            className="text-sm font-light leading-relaxed mb-12"
            style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}
          >
            Your payroll submission has been received. The admin team will review it shortly.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/payroll"
              className="w-full py-3.5 text-[10px] tracking-[0.3em] uppercase font-light flex items-center justify-center transition-opacity hover:opacity-60"
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'var(--font-josefin)',
              }}
            >
              Submit Another
            </Link>
            <Link
              href="/"
              className="w-full py-3 text-[9px] tracking-[0.25em] uppercase font-light flex items-center justify-center transition-opacity hover:opacity-60"
              style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}
            >
              Back to Events
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
