'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  employee_name: string;
  employee_role: string;
  pay_period_start: string;
  pay_period_end: string;
  events_count: number;
  events_description: string | null;
  shop_hours_type: string;
  shop_hours_manual: number | null;
  shop_hours_note: string | null;
  general_notes: string | null;
  status: string;
  admin_notes: string | null;
  submitted_at: string;
}

interface Reimbursement {
  id: string;
  amount: number;
  description: string | null;
  receipt_url: string;
  receipt_storage_path: string;
}

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted', color: 'rgba(120,180,220,0.7)' },
  { value: 'reviewed', label: 'Reviewed', color: 'rgba(120,200,140,0.7)' },
  { value: 'needs_followup', label: 'Needs Follow-up', color: 'rgba(220,160,80,0.7)' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const ok = sessionStorage.getItem('payroll_admin') === '1';
    setAuthed(ok);
    if (!ok) router.replace('/admin/payroll');
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, reimbRes] = await Promise.all([
        supabase.from('payroll_submissions').select('*').eq('id', id).single(),
        supabase.from('payroll_reimbursements').select('*').eq('submission_id', id).order('created_at'),
      ]);
      if (subRes.error) throw subRes.error;
      setSubmission(subRes.data as Submission);
      setAdminNotes(subRes.data.admin_notes ?? '');
      setReimbursements(reimbRes.data as Reimbursement[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  async function handleStatusChange(newStatus: string) {
    if (!submission) return;
    setSavingStatus(true);
    try {
      await supabase.from('payroll_submissions').update({ status: newStatus }).eq('id', id);
      setSubmission(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch (err) { console.error(err); }
    finally { setSavingStatus(false); }
  }

  async function saveAdminNotes() {
    setSavingNotes(true);
    try {
      await supabase.from('payroll_submissions').update({ admin_notes: adminNotes }).eq('id', id);
    } catch (err) { console.error(err); }
    finally { setSavingNotes(false); }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatPeriod(start: string, end: string) {
    const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    return `${new Date(start + 'T00:00:00').toLocaleDateString('en-US', opts)} – ${new Date(end + 'T00:00:00').toLocaleDateString('en-US', opts)}`;
  }

  function shopHoursLabel(sub: Submission) {
    if (sub.shop_hours_type === 'none') return 'No shop hours';
    if (sub.shop_hours_type === 'manual') return `Manual — ${sub.shop_hours_manual ?? '?'} hrs`;
    return `Workforce${sub.shop_hours_note ? ` (${sub.shop_hours_note})` : ''}`;
  }

  if (authed === null || (authed && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070c0e' }}>
        <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.15)' }} />
      </div>
    );
  }

  if (!authed) return null;

  const currentStatus = STATUS_OPTIONS.find(s => s.value === submission?.status) ?? STATUS_OPTIONS[0];

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
          <Link href="/admin/payroll" className="flex items-center gap-1.5 transition-opacity hover:opacity-50">
            <ChevronLeft size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </Link>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <Logo size="sm" asLink={false} />
        </div>
        <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
          Payroll Admin
        </span>
      </header>

      {submission && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Employee header */}
          <div className="px-5 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
              {submission.employee_role}
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '6px' }}>
              {submission.employee_name}
            </h1>
            <p style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
              Submitted {formatDate(submission.submitted_at)}
            </p>
          </div>

          <div className="px-5 py-6 space-y-8 max-w-lg">

            {/* Status */}
            <section>
              <div style={LABEL}>Status</div>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    disabled={savingStatus}
                    className="px-3 py-1.5 text-[9px] tracking-[0.18em] uppercase font-light transition-all"
                    style={{
                      fontFamily: 'var(--font-josefin)',
                      border: `1px solid ${opt.color}${submission.status === opt.value ? '' : '40'}`,
                      color: submission.status === opt.value ? opt.color : 'rgba(255,255,255,0.2)',
                      background: submission.status === opt.value ? `${opt.color}12` : 'transparent',
                    }}
                  >
                    {opt.label}
                    {savingStatus && submission.status !== opt.value && ''}
                  </button>
                ))}
                {savingStatus && <Loader2 size={12} className="animate-spin self-center" style={{ color: 'rgba(255,255,255,0.2)' }} />}
              </div>
            </section>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            {/* Pay period */}
            <section>
              <div style={LABEL}>Pay Period</div>
              <div style={VALUE}>{formatPeriod(submission.pay_period_start, submission.pay_period_end)}</div>
            </section>

            {/* Events */}
            <section>
              <div style={LABEL}>Events Worked</div>
              <div style={VALUE}>{submission.events_count} event{submission.events_count !== 1 ? 's' : ''}</div>
              {submission.events_description && (
                <div style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', marginTop: '6px' }}>
                  {submission.events_description}
                </div>
              )}
            </section>

            {/* Shop hours */}
            <section>
              <div style={LABEL}>Shop Hours</div>
              <div style={VALUE}>{shopHoursLabel(submission)}</div>
            </section>

            {/* Reimbursements */}
            {reimbursements.length > 0 && (
              <section>
                <div style={LABEL}>
                  Reimbursements — Total ${reimbursements.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)}
                </div>
                <div className="space-y-3 mt-1">
                  {reimbursements.map((r, i) => (
                    <div
                      key={r.id}
                      style={{ border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.03em' }}>
                            ${Number(r.amount).toFixed(2)}
                          </div>
                          {r.description && (
                            <div style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', marginTop: '3px' }}>
                              {r.description}
                            </div>
                          )}
                          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '10px' }}>
                            Item {i + 1}
                          </div>
                        </div>
                        <a
                          href={r.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 flex-shrink-0 transition-opacity hover:opacity-60"
                          style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(120,180,220,0.8)', fontFamily: 'var(--font-josefin)' }}
                        >
                          Receipt
                          <ExternalLink size={10} strokeWidth={1.5} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Employee notes */}
            {submission.general_notes && (
              <section>
                <div style={LABEL}>Employee Notes</div>
                <div style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-urbanist)', lineHeight: 1.7 }}>
                  {submission.general_notes}
                </div>
              </section>
            )}

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

            {/* Admin notes */}
            <section>
              <div style={LABEL}>Internal Notes <span style={{ opacity: 0.4 }}>(Admin Only)</span></div>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                onBlur={saveAdminNotes}
                rows={4}
                placeholder="Add internal notes, follow-up actions, etc."
                className="w-full resize-none outline-none placeholder:opacity-20"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-urbanist)',
                  fontWeight: 200,
                  fontSize: '13px',
                  padding: '12px 14px',
                  lineHeight: 1.7,
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={saveAdminNotes}
                  disabled={savingNotes}
                  className="text-[9px] tracking-[0.2em] uppercase font-light flex items-center gap-1.5 transition-opacity hover:opacity-60"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}
                >
                  {savingNotes && <Loader2 size={9} className="animate-spin" />}
                  {savingNotes ? 'Saving' : 'Save Notes'}
                </button>
              </div>
            </section>

            <div style={{ height: '48px' }} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

const LABEL: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  fontWeight: 300,
  color: 'rgba(255,255,255,0.2)',
  fontFamily: 'var(--font-josefin)',
  marginBottom: '8px',
};

const VALUE: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 200,
  color: 'rgba(255,255,255,0.7)',
  fontFamily: 'var(--font-urbanist)',
};
