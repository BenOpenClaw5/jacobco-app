'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, LogOut, Trash2 } from 'lucide-react';
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
  review_note: string | null;
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

const STATUS_ORDER: Record<string, number> = {
  needs_followup: 0,
  submitted: 1,
  reviewed: 2,
};

// ─── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ sub, onConfirm, onCancel, isDeleting }: {
  sub: Submission; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(7,12,14,0.92)', backdropFilter: 'blur(8px)' }} onClick={onCancel} />
      <motion.div
        className="relative w-full max-w-xs p-8"
        style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.97, y: 6 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <h3 className="text-base font-light tracking-[0.08em] mb-2" style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
          Delete Submission?
        </h3>
        <p className="text-xs font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          This permanently removes the submission and all reimbursements.
        </p>
        <p className="text-sm font-light mb-4" style={{ color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          &quot;{sub.employee_name}&quot;
        </p>
        <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light flex items-center justify-center gap-1.5 transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,100,100,0.3)', color: 'rgba(255,110,110,0.8)', fontFamily: 'var(--font-josefin)' }}>
            {isDeleting && <Loader2 size={10} className="animate-spin" />}
            {isDeleting ? 'Deleting' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: 0, fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '14px', padding: '0 0 10px 0', width: '100%', outline: 'none' }}
            />
          </div>
          {error && <p style={{ fontSize: '12px', color: '#ff6b6b', fontFamily: 'var(--font-urbanist)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-[10px] tracking-[0.3em] uppercase font-light flex items-center justify-center gap-2 transition-opacity"
            style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', fontFamily: 'var(--font-josefin)', opacity: loading ? 0.5 : 1 }}
          >
            {loading && <Loader2 size={11} className="animate-spin" />}
            {loading ? 'Verifying' : 'Enter'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Expected submitters ──────────────────────────────────────────────────────

const EXPECTED_SUBMITTERS = ['Augustus (Gus)', 'Ben', 'Jace', 'Max', 'Mia', 'Tommy', 'Van'];

function SubmissionStatusPanel({ submissions }: { submissions: Submission[] }) {
  // Find the most recent pay period in submissions, or the most recent period overall
  const latestStart = submissions.length > 0
    ? submissions.reduce((latest, s) => s.pay_period_start > latest ? s.pay_period_start : latest, submissions[0].pay_period_start)
    : null;

  const currentPeriodSubs = latestStart
    ? submissions.filter(s => s.pay_period_start === latestStart)
    : [];

  // Normalize names for matching (case insensitive, handle "Gus"/"Augustus")
  function nameMatches(submittedName: string, expected: string): boolean {
    const s = submittedName.toLowerCase().trim();
    const e = expected.toLowerCase().replace(/\s*\(.*\)/, '').trim();
    const eFull = expected.toLowerCase().trim();
    return s === eFull || s === e || s.includes(e) || e.includes(s.split(' ')[0]);
  }

  if (!latestStart) return null;

  const periodLabel = new Date(latestStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', marginBottom: '24px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '14px' }}>
        Current Period Submissions · {periodLabel}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {EXPECTED_SUBMITTERS.map(name => {
          const submitted = currentPeriodSubs.some(s => nameMatches(s.employee_name, name));
          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px',
              border: `1px solid ${submitted ? 'rgba(120,200,140,0.25)' : 'rgba(220,100,80,0.2)'}`,
              background: submitted ? 'rgba(120,200,140,0.05)' : 'rgba(220,100,80,0.04)',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: submitted ? 'rgba(120,200,140,0.8)' : 'rgba(220,100,80,0.7)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '11px', fontWeight: 300, color: submitted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}>
                {name.replace(' (Gus)', '')}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', marginTop: '12px' }}>
        {currentPeriodSubs.length} of {EXPECTED_SUBMITTERS.length} submitted
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [deletingSub, setDeletingSub] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);
  const periods = getRecentPayPeriods(10);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payroll_submissions')
        .select('id,employee_name,employee_role,pay_period_start,pay_period_end,events_count,shop_hours_type,status,submitted_at,general_notes,review_note')
        .order('submitted_at', { ascending: false });
      if (filterPeriod !== 'all') query = query.eq('pay_period_start', filterPeriod);
      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data as Submission[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterPeriod]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  async function handleDelete() {
    if (!deletingSub) return;
    setIsDeleting(true);
    try {
      await supabase.from('payroll_submissions').delete().eq('id', deletingSub.id);
      setSubmissions(prev => prev.filter(s => s.id !== deletingSub.id));
      setDeletingSub(null);
    } catch (err) { console.error(err); }
    finally { setIsDeleting(false); }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function formatPeriodFromDB(start: string, end: string) {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  }

  // Sort: needs_followup → submitted → reviewed
  const sorted = [...submissions].sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });

  const followups = sorted.filter(s => s.status === 'needs_followup');
  const pending   = sorted.filter(s => s.status === 'submitted');
  const reviewed  = sorted.filter(s => s.status === 'reviewed');

  function SubRow({ sub, dim = false }: { sub: Submission; dim?: boolean }) {
    const statusColor = STATUS_COLORS[sub.status] ?? 'rgba(255,255,255,0.3)';
    return (
      <div
        className="flex items-center group"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: dim ? 0.45 : 1 }}
      >
        <Link href={`/admin/payroll/${sub.id}`} className="flex-1 min-w-0 block">
          <motion.div
            className="flex items-center justify-between py-4 px-0"
            whileHover={{ x: 2 }}
            transition={{ duration: 0.12 }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ fontSize: '14px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.03em' }}>
                  {sub.employee_name}
                </span>
                <span className="text-[9px] tracking-[0.12em] uppercase font-light px-2 py-0.5"
                  style={{ color: statusColor, border: `1px solid ${statusColor}30`, fontFamily: 'var(--font-josefin)' }}>
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
              {sub.review_note && dim && (
                <p style={{ fontSize: '11px', fontStyle: 'italic', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', marginTop: '4px', fontWeight: 200 }}>
                  {sub.review_note}
                </p>
              )}
            </div>
            <ChevronRight size={12} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.15)' }} className="flex-shrink-0 ml-3 transition-transform group-hover:translate-x-0.5 duration-150" />
          </motion.div>
        </Link>
        {/* Delete */}
        <button
          onClick={e => { e.preventDefault(); setDeletingSub(sub); }}
          className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(255,100,100,0.55)' }}
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  function Section({ label, subs, dim = false }: { label: string; subs: Submission[]; dim?: boolean }) {
    if (subs.length === 0) return null;
    return (
      <div className="mb-8">
        <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {label}
        </div>
        {subs.map(sub => <SubRow key={sub.id} sub={sub} dim={dim} />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(7,12,14,0.96)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-4">
          <Logo size="sm" asLink={false} />
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
            Payroll Admin
          </span>
        </div>
        <button onClick={onSignOut} className="flex items-center gap-1.5 transition-opacity hover:opacity-50" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <LogOut size={12} strokeWidth={1.5} />
        </button>
      </header>

      <div className="px-5 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Submissions
        </div>
        <div className="flex items-end justify-between gap-4">
          <h1 style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
            Payroll
          </h1>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '6px 10px', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }}
            className="appearance-none"
          >
            <option value="all">All periods</option>
            {periods.map((p, i) => (
              <option key={i} value={toISO(p.start)}>{formatPeriodShort(p)}</option>
            ))}
          </select>
        </div>
      </div>

      <main className="px-5 py-6">
        {/* Submission status panel — always visible once data loads */}
        {!loading && <SubmissionStatusPanel submissions={submissions} />}

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Section label="Needs Follow-Up" subs={followups} />
            <Section label="Pending" subs={pending} />
            <Section label="Reviewed" subs={reviewed} dim />
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {deletingSub && (
          <DeleteConfirm
            sub={deletingSub}
            onConfirm={handleDelete}
            onCancel={() => setDeletingSub(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
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
