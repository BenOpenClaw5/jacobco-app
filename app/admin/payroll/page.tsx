'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { getRecentPayPeriods, formatPeriodShort, toISO } from '@/lib/payPeriod';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  employee_name: string;
  employee_role: string;
  pay_period_start: string;
  pay_period_end: string;
  events_count: number;
  shop_hours_type: string;
  status: string;
  submitted_at: string;
  general_notes: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  needs_followup: 'Needs Follow-up',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'rgba(120,180,220,0.7)',
  reviewed: 'rgba(120,200,140,0.7)',
  needs_followup: 'rgba(220,160,80,0.7)',
};

// ─── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onAuthed }: { onAuthed: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/payroll/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem('payroll_admin', '1');
        onAuthed();
      } else {
        setError('Incorrect password.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#070c0e' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xs"
      >
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '10px' }}>
            Jacob Co
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '0.06em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
            Payroll Admin
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', marginBottom: '12px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              style={{
                background: 'transparent', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff', borderRadius: 0,
                fontFamily: 'var(--font-urbanist)', fontWeight: 200,
                fontSize: '14px', padding: '0 0 10px 0', width: '100%', outline: 'none',
              }}
            />
          </div>
          {error && <p style={{ fontSize: '12px', color: '#ff6b6b', fontFamily: 'var(--font-urbanist)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-[10px] tracking-[0.3em] uppercase font-light flex items-center justify-center gap-2 transition-opacity"
            style={{
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#ffffff', fontFamily: 'var(--font-josefin)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading && <Loader2 size={11} className="animate-spin" />}
            {loading ? 'Verifying' : 'Enter'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const periods = getRecentPayPeriods(10);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payroll_submissions')
        .select('id,employee_name,employee_role,pay_period_start,pay_period_end,events_count,shop_hours_type,status,submitted_at,general_notes')
        .order('submitted_at', { ascending: false });

      if (filterPeriod !== 'all') {
        query = query.eq('pay_period_start', filterPeriod);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data as Submission[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterPeriod]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatPeriodFromDB(start: string, end: string) {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  }

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
        style={{
          background: 'rgba(7,12,14,0.96)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-4">
          <Logo size="sm" asLink={false} />
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
            Payroll Admin
          </span>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-50"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <LogOut size={12} strokeWidth={1.5} />
        </button>
      </header>

      {/* Heading + filter */}
      <div className="px-5 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Submissions
        </div>
        <div className="flex items-end justify-between gap-4">
          <h1 style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
            Payroll
          </h1>
          <select
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-josefin)',
              fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '6px 10px', outline: 'none', colorScheme: 'dark', cursor: 'pointer',
            }}
            className="appearance-none"
          >
            <option value="all">All periods</option>
            {periods.map((p, i) => (
              <option key={i} value={toISO(p.start)}>{formatPeriodShort(p)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <main className="px-5 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
              No submissions yet.
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-px"
          >
            {submissions.map(sub => (
              <Link key={sub.id} href={`/admin/payroll/${sub.id}`} className="block group">
                <motion.div
                  className="flex items-center justify-between py-4 px-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.12 }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span style={{ fontSize: '14px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.03em' }}>
                        {sub.employee_name}
                      </span>
                      <span
                        className="text-[9px] tracking-[0.12em] uppercase font-light px-2 py-0.5"
                        style={{
                          color: STATUS_COLORS[sub.status] ?? 'rgba(255,255,255,0.3)',
                          border: `1px solid ${STATUS_COLORS[sub.status] ?? 'rgba(255,255,255,0.1)'}30`,
                          fontFamily: 'var(--font-josefin)',
                        }}
                      >
                        {STATUS_LABELS[sub.status] ?? sub.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>
                        {sub.employee_role}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>
                        {formatPeriodFromDB(sub.pay_period_start, sub.pay_period_end)}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                        {formatDate(sub.submitted_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={12} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.15)' }} className="flex-shrink-0 ml-3 transition-transform group-hover:translate-x-0.5 duration-150" />
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPayrollPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(sessionStorage.getItem('payroll_admin') === '1');
  }, []);

  function handleSignOut() {
    sessionStorage.removeItem('payroll_admin');
    setAuthed(false);
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070c0e' }}>
        <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.15)' }} />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {authed ? (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard onSignOut={handleSignOut} />
        </motion.div>
      ) : (
        <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <PasswordGate onAuthed={() => setAuthed(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
