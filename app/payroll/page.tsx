'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, X, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import {
  getRecentPayPeriods, formatPeriodLong, formatDueDate,
  toISO, PayPeriod,
} from '@/lib/payPeriod';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReimbItem {
  localId: string;
  amount: string;
  description: string;
  file: File | null;
  storagePath: string | null;
  receiptUrl: string | null;
  uploading: boolean;
  uploadError: string | null;
}

function newReimb(): ReimbItem {
  return {
    localId: Math.random().toString(36).slice(2),
    amount: '',
    description: '',
    file: null,
    storagePath: null,
    receiptUrl: null,
    uploading: false,
    uploadError: null,
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  color: '#ffffff',
  borderRadius: 0,
  fontFamily: 'var(--font-urbanist)',
  fontWeight: 200,
  fontSize: '14px',
  padding: '0 0 10px 0',
  width: '100%',
  outline: 'none',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  fontWeight: 300,
  color: 'rgba(255,255,255,0.3)',
  fontFamily: 'var(--font-josefin)',
  marginBottom: '12px',
};

const SECTION_DIVIDER: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.06)',
  paddingTop: '28px',
  marginTop: '28px',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '20px' }}>
      {children}
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2.5 text-[10px] tracking-[0.22em] uppercase font-light transition-all"
      style={{
        fontFamily: 'var(--font-josefin)',
        border: active ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.3)',
        background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PayrollPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [periodIdx, setPeriodIdx] = useState(0);

  // Employee
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  // Events
  const [eventsCount, setEventsCount] = useState('0');
  const [eventsDesc, setEventsDesc] = useState('');

  // Shop hours
  const [shopHours, setShopHours] = useState<'none' | 'yes'>('none');
  const [shopHoursMode, setShopHoursMode] = useState<'workforce' | 'manual'>('workforce');
  const [shopHoursManual, setShopHoursManual] = useState('');
  const [shopHoursNote, setShopHoursNote] = useState('');

  // Reimbursements
  const [needsReimb, setNeedsReimb] = useState<'no' | 'yes'>('no');
  const [reimbs, setReimbs] = useState<ReimbItem[]>([newReimb()]);

  // General notes
  const [generalNotes, setGeneralNotes] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setPeriods(getRecentPayPeriods(10));
  }, []);

  const currentPeriod = periods[periodIdx];

  // ── Receipt upload ─────────────────────────────────────────────────────────

  async function uploadReceipt(localId: string, file: File) {
    setReimbs(prev => prev.map(r => r.localId === localId ? { ...r, uploading: true, uploadError: null, file } : r));
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `payroll/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payroll-receipts').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('payroll-receipts').getPublicUrl(path);
      setReimbs(prev => prev.map(r => r.localId === localId
        ? { ...r, uploading: false, storagePath: path, receiptUrl: urlData.publicUrl, file }
        : r
      ));
    } catch (err) {
      console.error(err);
      setReimbs(prev => prev.map(r => r.localId === localId
        ? { ...r, uploading: false, uploadError: 'Upload failed. Try again.' }
        : r
      ));
    }
  }

  function removeReceipt(localId: string) {
    setReimbs(prev => prev.map(r => r.localId === localId
      ? { ...r, file: null, storagePath: null, receiptUrl: null, uploadError: null }
      : r
    ));
  }

  function updateReimb(localId: string, patch: Partial<ReimbItem>) {
    setReimbs(prev => prev.map(r => r.localId === localId ? { ...r, ...patch } : r));
  }

  function addReimb() { setReimbs(prev => [...prev, newReimb()]); }

  function removeReimb(localId: string) {
    setReimbs(prev => prev.filter(r => r.localId !== localId));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) { setFormError('Employee name is required.'); return; }
    if (!role) { setFormError('Please select your role.'); return; }
    if (!currentPeriod) { setFormError('No pay period selected.'); return; }

    if (needsReimb === 'yes') {
      for (const r of reimbs) {
        if (!r.amount || isNaN(Number(r.amount))) { setFormError('Enter a valid amount for each reimbursement.'); return; }
        if (!r.storagePath) { setFormError('Please upload a receipt for each reimbursement item.'); return; }
        if (r.uploading) { setFormError('Please wait for uploads to finish.'); return; }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_name: name.trim(),
        employee_role: role,
        pay_period_start: toISO(currentPeriod.start),
        pay_period_end: toISO(currentPeriod.end),
        events_count: parseInt(eventsCount, 10) || 0,
        events_description: eventsDesc.trim() || '',
        shop_hours_type: shopHours === 'none' ? 'none' : shopHoursMode,
        shop_hours_manual: shopHours === 'yes' && shopHoursMode === 'manual' ? parseFloat(shopHoursManual) || null : null,
        shop_hours_note: shopHours === 'yes' && shopHoursMode === 'workforce' ? shopHoursNote.trim() : '',
        general_notes: generalNotes.trim() || '',
        reimbursements: needsReimb === 'yes'
          ? reimbs.map(r => ({
              amount: parseFloat(r.amount),
              description: r.description.trim(),
              receipt_url: r.receiptUrl!,
              receipt_storage_path: r.storagePath!,
            }))
          : [],
      };

      const res = await fetch('/api/payroll/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      router.push('/payroll/success');
    } catch (err) {
      setFormError((err as Error).message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-4 px-5 py-4"
        style={{
          background: 'rgba(7,12,14,0.96)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Link href="/" className="flex items-center gap-1.5 transition-opacity hover:opacity-50">
          <ChevronLeft size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </Link>
        <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <Logo size="sm" asLink={false} />
      </header>

      {/* Page title */}
      <div className="px-6 pt-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '10px' }}>
            Jacob Co
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '6px' }}>
            Payroll Submission
          </h1>
          {currentPeriod && (
            <p style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
              Due {formatDueDate(currentPeriod)}
            </p>
          )}
        </motion.div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-8 max-w-lg mx-auto space-y-0">

        {/* ── Pay Period ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <SectionLabel>Pay Period</SectionLabel>
          {periods.length > 0 ? (
            <div>
              <label style={LABEL_STYLE}>Select Period</label>
              <select
                value={periodIdx}
                onChange={e => setPeriodIdx(Number(e.target.value))}
                style={{ ...INPUT_STYLE, colorScheme: 'dark', cursor: 'pointer' }}
                className="appearance-none"
              >
                {periods.map((p, i) => (
                  <option key={i} value={i}>
                    {formatPeriodLong(p)}{i === 0 ? ' (most recent)' : ''}
                  </option>
                ))}
              </select>
              {currentPeriod && (
                <p style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', marginTop: '8px' }}>
                  Submission due {formatDueDate(currentPeriod)}
                </p>
              )}
            </div>
          ) : (
            <div style={{ height: '44px', display: 'flex', alignItems: 'center' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
          )}
        </motion.div>

        {/* ── Employee Info ── */}
        <motion.div style={SECTION_DIVIDER} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <SectionLabel>Employee</SectionLabel>
          <div className="space-y-6">
            <div>
              <label style={LABEL_STYLE}>Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={INPUT_STYLE}
                className="placeholder:opacity-20"
                autoComplete="name"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{ ...INPUT_STYLE, colorScheme: 'dark', cursor: 'pointer' }}
                className="appearance-none"
              >
                <option value="" disabled>Select your role</option>
                <option value="Lead Tech">Lead Tech</option>
                <option value="Assistant Tech / Other">Assistant Tech / Other</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* ── Events Worked ── */}
        <motion.div style={SECTION_DIVIDER} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <SectionLabel>Events Worked</SectionLabel>
          <div className="space-y-6">
            <div>
              <label style={LABEL_STYLE}>Number of Events</label>
              <select
                value={eventsCount}
                onChange={e => setEventsCount(e.target.value)}
                style={{ ...INPUT_STYLE, colorScheme: 'dark', cursor: 'pointer' }}
                className="appearance-none"
              >
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={String(i)}>{i === 0 ? '0 — No events' : i}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Event Names / Description <span style={{ opacity: 0.4 }}>(optional)</span></label>
              <textarea
                value={eventsDesc}
                onChange={e => setEventsDesc(e.target.value)}
                placeholder="e.g. Martinez Wedding, Flores Quince"
                rows={2}
                style={{ ...INPUT_STYLE, resize: 'none' }}
                className="placeholder:opacity-20"
              />
            </div>
          </div>
        </motion.div>

        {/* ── Shop Hours ── */}
        <motion.div style={SECTION_DIVIDER} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <SectionLabel>Shop Hours</SectionLabel>
          <label style={{ ...LABEL_STYLE, marginBottom: '10px' }}>Worked shop hours this period?</label>
          <div className="flex gap-2 mb-5">
            <Toggle active={shopHours === 'none'} onClick={() => setShopHours('none')}>No</Toggle>
            <Toggle active={shopHours === 'yes'} onClick={() => setShopHours('yes')}>Yes</Toggle>
          </div>

          <AnimatePresence>
            {shopHours === 'yes' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <label style={{ ...LABEL_STYLE, marginBottom: '10px' }}>Hours tracking method</label>
                <div className="flex gap-2 mb-5">
                  <Toggle active={shopHoursMode === 'workforce'} onClick={() => setShopHoursMode('workforce')}>
                    Workforce
                  </Toggle>
                  <Toggle active={shopHoursMode === 'manual'} onClick={() => setShopHoursMode('manual')}>
                    Enter Manually
                  </Toggle>
                </div>

                <AnimatePresence mode="wait">
                  {shopHoursMode === 'manual' ? (
                    <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <label style={LABEL_STYLE}>Total Hours Worked</label>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={shopHoursManual}
                        onChange={e => setShopHoursManual(e.target.value)}
                        placeholder="e.g. 12.5"
                        style={INPUT_STYLE}
                        className="placeholder:opacity-20"
                      />
                    </motion.div>
                  ) : (
                    <motion.div key="workforce" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <label style={LABEL_STYLE}>Note <span style={{ opacity: 0.4 }}>(optional)</span></label>
                      <input
                        value={shopHoursNote}
                        onChange={e => setShopHoursNote(e.target.value)}
                        placeholder="Any caveat or clarification"
                        style={INPUT_STYLE}
                        className="placeholder:opacity-20"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Reimbursements ── */}
        <motion.div style={SECTION_DIVIDER} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
          <SectionLabel>Reimbursements</SectionLabel>
          <label style={{ ...LABEL_STYLE, marginBottom: '10px' }}>Need reimbursement for any purchases?</label>
          <div className="flex gap-2 mb-5">
            <Toggle active={needsReimb === 'no'} onClick={() => setNeedsReimb('no')}>No</Toggle>
            <Toggle active={needsReimb === 'yes'} onClick={() => setNeedsReimb('yes')}>Yes</Toggle>
          </div>

          <AnimatePresence>
            {needsReimb === 'yes' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-4"
              >
                {reimbs.map((item, idx) => (
                  <ReimbursementItemUI
                    key={item.localId}
                    item={item}
                    index={idx}
                    showRemove={reimbs.length > 1}
                    fileRef={(el) => { fileRefs.current[item.localId] = el; }}
                    onAmountChange={v => updateReimb(item.localId, { amount: v })}
                    onDescriptionChange={v => updateReimb(item.localId, { description: v })}
                    onFileChange={file => uploadReceipt(item.localId, file)}
                    onRemoveFile={() => removeReceipt(item.localId)}
                    onRemoveItem={() => removeReimb(item.localId)}
                  />
                ))}

                <button
                  type="button"
                  onClick={addReimb}
                  className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-60 mt-2"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}
                >
                  <Plus size={11} strokeWidth={1.5} />
                  Add Another Item
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── General Notes ── */}
        <motion.div style={SECTION_DIVIDER} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <SectionLabel>Final Notes</SectionLabel>
          <label style={LABEL_STYLE}>Anything else? <span style={{ opacity: 0.4 }}>(optional)</span></label>
          <textarea
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
            placeholder="Any final comments or questions"
            rows={3}
            style={{ ...INPUT_STYLE, resize: 'none' }}
            className="placeholder:opacity-20"
          />
        </motion.div>

        {/* ── Submit ── */}
        <div style={{ paddingTop: '32px', paddingBottom: '48px' }}>
          {formError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: '12px', color: '#ff6b6b', fontFamily: 'var(--font-urbanist)', marginBottom: '16px' }}
            >
              {formError}
            </motion.p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 text-[10px] tracking-[0.35em] uppercase font-light flex items-center justify-center gap-2 transition-opacity"
            style={{
              border: '1px solid rgba(255,255,255,0.5)',
              color: submitting ? 'rgba(255,255,255,0.3)' : '#ffffff',
              fontFamily: 'var(--font-josefin)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {submitting ? 'Submitting' : 'Submit Payroll'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Reimbursement Item Component ─────────────────────────────────────────────

interface ReimbItemUIProps {
  item: ReimbItem;
  index: number;
  showRemove: boolean;
  fileRef: (el: HTMLInputElement | null) => void;
  onAmountChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onFileChange: (file: File) => void;
  onRemoveFile: () => void;
  onRemoveItem: () => void;
}

function ReimbursementItemUI({
  item, index, showRemove, fileRef,
  onAmountChange, onDescriptionChange, onFileChange, onRemoveFile, onRemoveItem,
}: ReimbItemUIProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fileRef(inputRef.current);
  });

  const INPUT_STYLE: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#ffffff',
    borderRadius: 0,
    fontFamily: 'var(--font-urbanist)',
    fontWeight: 200,
    fontSize: '14px',
    padding: '0 0 8px 0',
    outline: 'none',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      style={{ border: '1px solid rgba(255,255,255,0.07)', padding: '18px 16px', background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
          Item {index + 1}
        </span>
        {showRemove && (
          <button type="button" onClick={onRemoveItem} className="transition-opacity hover:opacity-60">
            <X size={12} style={{ color: 'rgba(255,100,100,0.5)' }} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Amount */}
        <div className="flex items-end gap-2">
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', paddingBottom: '8px', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={item.amount}
            onChange={e => onAmountChange(e.target.value)}
            placeholder="0.00"
            style={{ ...INPUT_STYLE, flex: 1 }}
            className="placeholder:opacity-20"
          />
        </div>

        {/* Description */}
        <input
          value={item.description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder="Description (optional)"
          style={{ ...INPUT_STYLE, width: '100%' }}
          className="placeholder:opacity-20"
        />

        {/* Receipt */}
        <div>
          {item.storagePath ? (
            <div className="flex items-center gap-3">
              <div
                className="flex-1 flex items-center gap-2 py-2 px-3"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(120,200,120,0.7)', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.file?.name ?? 'Receipt uploaded'}
                </span>
              </div>
              <button type="button" onClick={onRemoveFile} className="transition-opacity hover:opacity-60 flex-shrink-0">
                <X size={12} style={{ color: 'rgba(255,100,100,0.5)' }} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={item.uploading}
              className="flex items-center gap-2 py-2 px-3 text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.35)',
                fontFamily: 'var(--font-josefin)',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {item.uploading
                ? <><Loader2 size={11} className="animate-spin" /> Uploading</>
                : <><Upload size={11} strokeWidth={1.5} /> Upload Receipt</>
              }
            </button>
          )}
          {item.uploadError && (
            <p style={{ fontSize: '11px', color: '#ff6b6b', marginTop: '6px', fontFamily: 'var(--font-urbanist)' }}>
              {item.uploadError}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
          />
        </div>
      </div>
    </motion.div>
  );
}
