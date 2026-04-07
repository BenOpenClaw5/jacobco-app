'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2, ExternalLink, Trash2 } from 'lucide-react';
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
  review_note: string | null;
  submitted_at: string;
}

interface Reimbursement {
  id: string;
  amount: number;
  description: string | null;
  receipt_url: string;
  receipt_storage_path: string;
}

const ACTION_BUTTONS = [
  { value: 'reviewed',      label: 'Mark as Reviewed' },
  { value: 'needs_followup', label: 'Needs Follow-up' },
] as const;

const SELECTED_BTN_STYLES: Record<string, React.CSSProperties> = {
  reviewed: {
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.6)',
    color: 'rgb(34,197,94)',
    boxShadow: '0 0 8px rgba(34,197,94,0.2)',
  },
  needs_followup: {
    background: 'rgba(251,146,60,0.12)',
    border: '1px solid rgba(251,146,60,0.6)',
    color: 'rgb(251,146,60)',
    boxShadow: '0 0 8px rgba(251,146,60,0.2)',
  },
};

const UNSELECTED_BTN_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.28)',
  boxShadow: 'none',
};

// ─── Review Note Modal ────────────────────────────────────────────────────────

function ReviewNoteModal({ onSave, onSkip }: { onSave: (note: string) => void; onSkip: () => void }) {
  const [note, setNote] = useState('');
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(7,12,14,0.92)', backdropFilter: 'blur(8px)' }} onClick={onSkip} />
      <motion.div
        className="relative w-full max-w-sm p-8"
        style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.97, y: 6 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Mark as Reviewed
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.06em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '20px' }}>
          Leave a note?
        </h3>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }} />
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="Approved by Heather..."
          autoFocus
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            color: '#ffffff',
            fontFamily: 'var(--font-urbanist)',
            fontWeight: 200,
            fontSize: '13px',
            padding: '0 0 8px 0',
            outline: 'none',
            resize: 'none',
            marginBottom: '24px',
          }}
          className="placeholder:opacity-20"
        />
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}
          >
            Skip
          </button>
          <button
            onClick={() => onSave(note.trim())}
            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-70"
            style={{ border: '1px solid rgba(120,200,140,0.4)', color: 'rgba(120,200,140,0.9)', fontFamily: 'var(--font-josefin)' }}
          >
            Save Note
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel, isDeleting }: {
  onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
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
          Delete Permanently?
        </h3>
        <p className="text-xs font-light mb-5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          This cannot be undone. The submission and all reimbursement records will be deleted.
        </p>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }} />
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
  const [showReviewNote, setShowReviewNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    // Toggle: clicking the current status resets to 'submitted'
    const finalStatus = submission.status === newStatus ? 'submitted' : newStatus;

    // If marking as reviewed, show note popup first
    if (finalStatus === 'reviewed') {
      setShowReviewNote(true);
      return;
    }

    setSavingStatus(true);
    try {
      await supabase.from('payroll_submissions').update({ status: finalStatus }).eq('id', id);
      setSubmission(prev => prev ? { ...prev, status: finalStatus } : prev);
    } catch (err) { console.error(err); }
    finally { setSavingStatus(false); }
  }

  async function handleReviewWithNote(note: string) {
    setShowReviewNote(false);
    setSavingStatus(true);
    try {
      const updates: Record<string, string> = { status: 'reviewed' };
      if (note) updates.review_note = note;
      await supabase.from('payroll_submissions').update(updates).eq('id', id);
      setSubmission(prev => prev ? { ...prev, status: 'reviewed', review_note: note || prev.review_note } : prev);
    } catch (err) { console.error(err); }
    finally { setSavingStatus(false); }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await supabase.from('payroll_submissions').delete().eq('id', id);
      router.replace('/admin/payroll');
    } catch (err) { console.error(err); setIsDeleting(false); }
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

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(7,12,14,0.96)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-4">
          <Link href="/admin/payroll" className="flex items-center gap-1.5 transition-opacity hover:opacity-50">
            <ChevronLeft size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </Link>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <Logo size="sm" asLink={false} />
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
            Payroll Admin
          </span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center justify-center w-7 h-7 transition-opacity hover:opacity-60"
            style={{ color: 'rgba(255,100,100,0.45)', border: '1px solid rgba(255,100,100,0.15)' }}
          >
            <Trash2 size={11} strokeWidth={1.5} />
          </button>
        </div>
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
              <div style={LABEL}>
                Status
                <span style={{ opacity: 0.4, fontWeight: 200, fontSize: '9px', marginLeft: '8px' }}>
                  — {submission.status === 'reviewed' ? 'Reviewed' : submission.status === 'needs_followup' ? 'Needs Follow-up' : 'Pending'} · click active to unmark
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {ACTION_BUTTONS.map(btn => {
                  const isActive = submission.status === btn.value;
                  const btnStyle = isActive ? SELECTED_BTN_STYLES[btn.value] : UNSELECTED_BTN_STYLE;
                  return (
                    <button
                      key={btn.value}
                      onClick={() => handleStatusChange(btn.value)}
                      disabled={savingStatus}
                      className="px-3 py-1.5 text-[9px] tracking-[0.18em] uppercase font-light"
                      style={{
                        fontFamily: 'var(--font-josefin)',
                        transition: 'all 100ms ease',
                        ...btnStyle,
                      }}
                    >
                      {btn.label}
                    </button>
                  );
                })}
                {savingStatus && <Loader2 size={12} className="animate-spin self-center" style={{ color: 'rgba(255,255,255,0.2)' }} />}
              </div>
              {/* Review note display */}
              {submission.review_note && submission.status === 'reviewed' && (
                <p style={{ fontSize: '11px', fontStyle: 'italic', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-urbanist)', marginTop: '10px', fontWeight: 200 }}>
                  &ldquo;{submission.review_note}&rdquo;
                </p>
              )}
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
                    <div key={r.id} style={{ border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}>
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
                        <a href={r.receipt_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 flex-shrink-0 transition-opacity hover:opacity-60"
                          style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(120,180,220,0.8)', fontFamily: 'var(--font-josefin)' }}>
                          Receipt <ExternalLink size={10} strokeWidth={1.5} />
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
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '13px', padding: '12px 14px', lineHeight: 1.7 }}
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

      <AnimatePresence>
        {showReviewNote && (
          <ReviewNoteModal
            onSave={handleReviewWithNote}
            onSkip={() => handleReviewWithNote('')}
          />
        )}
        {showDeleteConfirm && (
          <DeleteConfirm
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
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
