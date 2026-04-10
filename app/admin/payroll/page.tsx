'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronRight, LogOut, Trash2, Users, Clock, DollarSign, AlertCircle, Check, X, ExternalLink, BarChart2, Download } from 'lucide-react';
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
  shop_hours_manual: number | null;
  status: string;
  submitted_at: string;
  general_notes: string | null;
  review_note: string | null;
}

interface Reimbursement {
  id: string;
  submission_id: string;
  amount: number;
  description: string | null;
  receipt_url: string;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Pending',
  reviewed: 'Reviewed',
  needs_followup: 'Follow-up',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'rgba(120,180,220,0.8)',
  reviewed: 'rgba(34,197,94,0.8)',
  needs_followup: 'rgba(251,146,60,0.8)',
};

const STATUS_ORDER: Record<string, number> = {
  needs_followup: 0,
  submitted: 1,
  reviewed: 2,
};

const EXPECTED_SUBMITTERS = ['Augustus (Gus)', 'Ben', 'Jace', 'Max', 'Mia', 'Tommy', 'Van'];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = '#ffffff', sub }: {
  label: string; value: string | number; icon: React.ElementType; color?: string; sub?: string;
}) {
  return (
    <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '20px', flex: 1, minWidth: 0 }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)', marginBottom: '10px' }}>
            {label}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 100, color, fontFamily: 'var(--font-josefin)', lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, marginTop: '4px' }}>
              {sub}
            </div>
          )}
        </div>
        <Icon size={16} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── Who Hasn't Submitted ─────────────────────────────────────────────────────

function SubmissionStatus({ submissions }: { submissions: Submission[] }) {
  const latestStart = submissions.length > 0
    ? submissions.reduce((latest, s) => s.pay_period_start > latest ? s.pay_period_start : latest, submissions[0].pay_period_start)
    : null;

  const currentSubs = latestStart ? submissions.filter(s => s.pay_period_start === latestStart) : [];

  function nameMatches(submitted: string, expected: string): boolean {
    const s = submitted.toLowerCase().trim();
    const e = expected.toLowerCase().replace(/\s*\(.*\)/, '').trim();
    return s === expected.toLowerCase().trim() || s === e || s.includes(e) || e.includes(s.split(' ')[0]);
  }

  if (!latestStart) return null;

  const periodLabel = new Date(latestStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const submittedCount = EXPECTED_SUBMITTERS.filter(name => currentSubs.some(s => nameMatches(s.employee_name, name))).length;

  return (
    <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '20px', marginBottom: '24px' }}>
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
          Period of {periodLabel}
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          {submittedCount} of {EXPECTED_SUBMITTERS.length} submitted
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXPECTED_SUBMITTERS.map(name => {
          const submitted = currentSubs.some(s => nameMatches(s.employee_name, name));
          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px',
              background: submitted ? 'rgba(34,197,94,0.06)' : 'rgba(220,100,80,0.04)',
              border: `1px solid ${submitted ? 'rgba(34,197,94,0.2)' : 'rgba(220,100,80,0.15)'}`,
            }}>
              {submitted
                ? <Check size={10} style={{ color: 'rgba(34,197,94,0.8)', flexShrink: 0 }} />
                : <X size={10} style={{ color: 'rgba(220,100,80,0.7)', flexShrink: 0 }} />
              }
              <span style={{ fontSize: '11px', fontWeight: 300, color: submitted ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-josefin)' }}>
                {name.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Role Pie Chart (SVG) ────────────────────────────────────────────────────

function RolePieChart({ submissions }: { submissions: Submission[] }) {
  const roles: Record<string, number> = {};
  submissions.forEach(s => { roles[s.employee_role] = (roles[s.employee_role] || 0) + 1; });

  const entries = Object.entries(roles).sort((a, b) => b[1] - a[1]);
  const total = submissions.length;
  if (total === 0) return null;

  const COLORS = ['rgba(196,154,42,0.9)', 'rgba(96,165,250,0.9)', 'rgba(34,197,94,0.9)', 'rgba(251,146,60,0.9)', 'rgba(168,85,247,0.9)'];

  let cumulativeAngle = -Math.PI / 2;
  const slices = entries.map(([role, count], i) => {
    const fraction = count / total;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + fraction * 2 * Math.PI;
    cumulativeAngle = endAngle;

    const r = 60;
    const x1 = 75 + r * Math.cos(startAngle);
    const y1 = 75 + r * Math.sin(startAngle);
    const x2 = 75 + r * Math.cos(endAngle);
    const y2 = 75 + r * Math.sin(endAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;

    return {
      role, count, fraction,
      path: `M75,75 L${x1},${y1} A${r},${r},0,${largeArc},1,${x2},${y2} Z`,
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '20px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)', marginBottom: '16px' }}>
        Role Breakdown
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <svg width="150" height="150" viewBox="0 0 150 150">
          {slices.map(s => (
            <path key={s.role} d={s.path} fill={s.color} opacity={0.85} />
          ))}
          <circle cx="75" cy="75" r="28" fill="#0c1317" />
          <text x="75" y="70" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="var(--font-josefin)">{total}</text>
          <text x="75" y="83" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="var(--font-josefin)">TOTAL</text>
        </svg>
        <div className="space-y-2">
          {slices.map(s => (
            <div key={s.role} className="flex items-center gap-2">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                {s.role.split('/')[0].trim()} · {s.count} ({Math.round(s.fraction * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ sub, onConfirm, onCancel, isDeleting }: {
  sub: Submission; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(7,12,14,0.92)', backdropFilter: 'blur(8px)' }} onClick={onCancel} />
      <motion.div className="relative w-full max-w-xs p-8"
        style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.97, y: 6 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <h3 className="text-base font-light tracking-[0.08em] mb-2" style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
          Delete Submission?
        </h3>
        <p className="text-xs font-light mb-4" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          &quot;{sub.employee_name}&quot; · Permanently removes submission and all reimbursements.
        </p>
        <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light flex items-center justify-center gap-1.5"
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
      if (data.ok) { sessionStorage.setItem('payroll_admin', '1'); onAuthed(); }
      else setError('Incorrect password.');
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#070c0e' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-xs">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '10px' }}>Jacob Co</div>
          <h1 style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '0.06em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>Payroll Admin</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', marginBottom: '12px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: 0, fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '14px', padding: '0 0 10px 0', width: '100%', outline: 'none' }} />
          </div>
          {error && <p style={{ fontSize: '12px', color: '#ff6b6b', fontFamily: 'var(--font-urbanist)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3.5 text-[10px] tracking-[0.3em] uppercase font-light flex items-center justify-center gap-2"
            style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', fontFamily: 'var(--font-josefin)', opacity: loading ? 0.5 : 1 }}>
            {loading && <Loader2 size={11} className="animate-spin" />}
            {loading ? 'Verifying' : 'Enter'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Report Generator ─────────────────────────────────────────────────────────

function ReportModal({ submissions, reimbursements, onClose }: {
  submissions: Submission[];
  reimbursements: Reimbursement[];
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<'current' | '30' | '90' | 'all'>('current');

  const latestStart = submissions.length > 0
    ? submissions.reduce((l, s) => s.pay_period_start > l ? s.pay_period_start : l, submissions[0].pay_period_start)
    : null;

  const now = new Date();
  const filtered = submissions.filter(s => {
    if (period === 'current') return s.pay_period_start === latestStart;
    if (period === '30') return new Date(s.submitted_at) >= new Date(now.getTime() - 30 * 86400000);
    if (period === '90') return new Date(s.submitted_at) >= new Date(now.getTime() - 90 * 86400000);
    return true;
  });

  const totalReimb = reimbursements
    .filter(r => filtered.some(s => s.id === r.submission_id))
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(7,12,14,0.92)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <motion.div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.97, y: 8 }} animate={{ scale: 1, y: 0 }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>Generate Report</span>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)' }}><X size={14} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="flex gap-2 mb-6 flex-wrap">
            {([['current', 'This Period'], ['30', 'Last 30 Days'], ['90', 'Last 90 Days'], ['all', 'All Time']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setPeriod(v)}
                style={{
                  padding: '5px 12px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-josefin)',
                  background: period === v ? 'rgba(196,154,42,0.15)' : 'transparent',
                  border: `1px solid ${period === v ? 'rgba(196,154,42,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  color: period === v ? 'rgb(196,154,42)' : 'rgba(255,255,255,0.35)',
                }}>
                {l}
              </button>
            ))}
          </div>

          {/* Report preview */}
          <div id="report-content" style={{ background: '#ffffff', color: '#000000', padding: '40px', fontFamily: 'var(--font-urbanist)' }}>
            <div style={{ marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
              <div style={{ fontSize: '22px', fontWeight: 300, letterSpacing: '0.06em', color: '#000' }}>Jacob Co Creative</div>
              <div style={{ fontSize: '12px', color: '#444', marginTop: '4px' }}>
                Payroll Report · Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                Period: {period === 'current' ? 'Current Pay Period' : period === '30' ? 'Last 30 Days' : period === '90' ? 'Last 90 Days' : 'All Time'}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {['Name', 'Role', 'Events', 'Shop Hrs', 'Reimbursement', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: 500, letterSpacing: '0.05em', fontSize: '10px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const reimb = reimbursements.filter(r => r.submission_id === s.id).reduce((sum, r) => sum + Number(r.amount), 0);
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #eee' }}>{s.employee_name}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #eee', fontSize: '10px', color: '#555' }}>{s.employee_role.split('/')[0].trim()}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #eee' }}>{s.events_count}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #eee' }}>{s.shop_hours_type === 'manual' ? `${s.shop_hours_manual}h` : s.shop_hours_type === 'none' ? '—' : 'Workforce'}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #eee' }}>{reimb > 0 ? `$${reimb.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '7px 10px', borderBottom: '1px solid #eee', fontSize: '10px' }}>{STATUS_LABELS[s.status] ?? s.status}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 500 }}>
                  <td colSpan={4} style={{ padding: '10px 10px 0', borderTop: '2px solid #000', fontSize: '11px' }}>
                    Total Reimbursements
                  </td>
                  <td style={{ padding: '10px 10px 0', borderTop: '2px solid #000' }}>${totalReimb.toFixed(2)}</td>
                  <td style={{ borderTop: '2px solid #000' }} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-light"
              style={{ background: 'transparent', border: '1px solid rgba(196,154,42,0.5)', color: 'rgba(196,154,42,0.9)', fontFamily: 'var(--font-josefin)' }}>
              <Download size={11} />
              Export PDF
            </button>
            <button onClick={onClose} className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-light"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-josefin)' }}>
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [deletingSub, setDeletingSub] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const periods = getRecentPayPeriods(10);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payroll_submissions')
        .select('id,employee_name,employee_role,pay_period_start,pay_period_end,events_count,shop_hours_type,shop_hours_manual,status,submitted_at,general_notes,review_note')
        .order('submitted_at', { ascending: false });
      if (filterPeriod !== 'all') query = query.eq('pay_period_start', filterPeriod);
      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data as Submission[]);

      // Load reimbursements
      const ids = (data as Submission[]).map(s => s.id);
      if (ids.length > 0) {
        const { data: reimbs } = await supabase.from('payroll_reimbursements').select('id,submission_id,amount,description,receipt_url').in('submission_id', ids);
        setReimbursements((reimbs ?? []) as Reimbursement[]);
      }
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

  // Stats
  const totalReimbs = reimbursements.filter(r => {
    const sub = submissions.find(s => s.id === r.submission_id);
    return sub?.status === 'reviewed';
  }).reduce((sum, r) => sum + Number(r.amount), 0);

  const pending = submissions.filter(s => s.status === 'submitted');
  const followups = submissions.filter(s => s.status === 'needs_followup');
  const reviewed = submissions.filter(s => s.status === 'reviewed');

  // Group by period for display
  const periodMap: Map<string, Submission[]> = new Map();
  for (const s of submissions) {
    const key = s.pay_period_start;
    if (!periodMap.has(key)) periodMap.set(key, []);
    periodMap.get(key)!.push(s);
  }

  const sortedPeriods = [...periodMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  function SubRow({ sub, dim = false }: { sub: Submission; dim?: boolean }) {
    const statusColor = STATUS_COLORS[sub.status] ?? 'rgba(255,255,255,0.3)';
    return (
      <div className="flex items-center group" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: dim ? 0.5 : 1 }}>
        <Link href={`/admin/payroll/${sub.id}`} className="flex-1 min-w-0 block">
          <motion.div className="flex items-center justify-between py-3.5 px-0" whileHover={{ x: 2 }} transition={{ duration: 0.12 }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span style={{ fontSize: '13px', fontWeight: 300, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-josefin)', letterSpacing: '0.03em' }}>
                  {sub.employee_name}
                </span>
                <span className="text-[9px] tracking-[0.12em] uppercase font-light px-2 py-0.5"
                  style={{ color: statusColor, border: `1px solid ${statusColor}40`, fontFamily: 'var(--font-josefin)' }}>
                  {STATUS_LABELS[sub.status] ?? sub.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)' }}>
                  {sub.employee_role}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>
                  {formatPeriodFromDB(sub.pay_period_start, sub.pay_period_end)}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                  {formatDate(sub.submitted_at)}
                </span>
              </div>
              {sub.review_note && dim && (
                <p style={{ fontSize: '11px', fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', marginTop: '4px', fontWeight: 200 }}>
                  {sub.review_note}
                </p>
              )}
            </div>
            <ChevronRight size={12} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.15)' }} className="flex-shrink-0 ml-3" />
          </motion.div>
        </Link>
        <button onClick={e => { e.preventDefault(); setDeletingSub(sub); }}
          className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100"
          style={{ color: 'rgba(255,100,100,0.55)' }}>
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(7,12,14,0.96)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-4">
          <Logo size="sm" asLink={false} />
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
            Payroll Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] tracking-[0.18em] uppercase font-light transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(196,154,42,0.3)', color: 'rgba(196,154,42,0.7)', fontFamily: 'var(--font-josefin)' }}>
            <BarChart2 size={10} strokeWidth={1.5} />
            Report
          </button>
          <button onClick={onSignOut} className="flex items-center gap-1.5 transition-opacity hover:opacity-50" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <LogOut size={12} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="px-5 py-6 max-w-3xl mx-auto">
        {/* ── Section 1: Stats ── */}
        {!loading && (
          <div className="flex gap-3 mb-6 flex-wrap">
            <StatCard label="Total Submissions" value={submissions.length} icon={Users} />
            <StatCard label="Pending Review" value={pending.length} icon={Clock} color={pending.length > 0 ? 'rgba(120,180,220,0.9)' : '#ffffff'} />
            <StatCard label="Reimbursements" value={`$${totalReimbs.toFixed(0)}`} icon={DollarSign} color="rgba(34,197,94,0.9)" sub="approved this view" />
            <StatCard label="Needs Follow-Up" value={followups.length} icon={AlertCircle} color={followups.length > 0 ? 'rgba(251,146,60,0.9)' : '#ffffff'} />
          </div>
        )}

        {/* ── Section 2: Who Hasn't Submitted ── */}
        {!loading && <SubmissionStatus submissions={submissions} />}

        {/* ── Section 3: Submissions List ── */}
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
              Submissions
            </h2>
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '6px 10px', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }}
              className="appearance-none">
              <option value="all">All periods</option>
              {periods.map((p, i) => (
                <option key={i} value={toISO(p.start)}>{formatPeriodShort(p)}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-20 text-center" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', fontSize: '12px', fontWeight: 200 }}>
              No submissions yet.
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Needs follow-up */}
              {followups.length > 0 && (
                <div className="mb-6">
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(251,146,60,0.6)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
                    Needs Follow-Up · {followups.length}
                  </div>
                  {followups.map(sub => <SubRow key={sub.id} sub={sub} />)}
                </div>
              )}
              {/* Pending */}
              {pending.length > 0 && (
                <div className="mb-6">
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(120,180,220,0.6)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
                    Pending · {pending.length}
                  </div>
                  {pending.map(sub => <SubRow key={sub.id} sub={sub} />)}
                </div>
              )}
              {/* Reviewed */}
              {reviewed.length > 0 && (
                <div className="mb-6">
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(34,197,94,0.5)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
                    Reviewed · {reviewed.length}
                  </div>
                  {reviewed.map(sub => <SubRow key={sub.id} sub={sub} dim />)}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Section 4: Analytics ── */}
        {!loading && submissions.length > 0 && (
          <div className="mb-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '16px' }}>
              Analytics
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <RolePieChart submissions={submissions} />

              {/* Reimbursements */}
              {reimbursements.length > 0 && (
                <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '20px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)', marginBottom: '16px' }}>
                    Reimbursements — ${reimbursements.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)} total
                  </div>
                  <div className="space-y-2">
                    {reimbursements.slice(0, 6).map(r => {
                      const sub = submissions.find(s => s.id === r.submission_id);
                      return (
                        <div key={r.id} className="flex items-center justify-between">
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 300, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-josefin)' }}>
                              {sub?.employee_name ?? '—'}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>
                              {r.description ?? 'Expense'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-josefin)' }}>
                              ${Number(r.amount).toFixed(2)}
                            </span>
                            {r.receipt_url && (
                              <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(120,180,220,0.6)' }}>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {deletingSub && (
          <DeleteConfirm sub={deletingSub} onConfirm={handleDelete} onCancel={() => setDeletingSub(null)} isDeleting={isDeleting} />
        )}
        {showReport && (
          <ReportModal submissions={submissions} reimbursements={reimbursements} onClose={() => setShowReport(false)} />
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
