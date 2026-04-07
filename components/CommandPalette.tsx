'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PalettePrefill } from '@/lib/commandPaletteContext';
import { Event, InventoryCase, Stage, Shop, STAGES, SHOPS } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandDef {
  id: string;
  label: string;
  description: string;
  category: 'action' | 'query';
}

const COMMANDS: CommandDef[] = [
  { id: 'create-event',    label: 'Create Event',            description: 'Add a new production event',                  category: 'action' },
  { id: 'move-case',       label: 'Move Case to Stage',      description: 'Move a case to a different stage',            category: 'action' },
  { id: 'transfer-case',   label: 'Transfer Case to Shop',   description: 'Transfer a case between shops',              category: 'action' },
  { id: 'remove-case',     label: 'Remove Case from Event',  description: 'Remove a case assignment from an event',     category: 'action' },
  { id: 'attach-doc',      label: 'Attach Doc to Event',     description: 'Link a Google Doc or deck to an event',      category: 'action' },
  { id: 'duplicate-event', label: 'Duplicate Event',         description: 'Copy an event and all its case assignments', category: 'action' },
  { id: 'process-return',  label: 'Process Return',          description: 'Start return processing for an event',       category: 'action' },
  { id: 'where-is-case',   label: 'Where Is This Case?',     description: 'Find where a case is right now',             category: 'query'  },
  { id: 'cases-at-event',  label: 'Cases at Event',          description: 'Count how many cases are assigned to an event', category: 'query' },
  { id: 'cases-at-shop',   label: 'Cases at Shop',           description: 'Count cases currently at a shop',            category: 'query'  },
  { id: 'available-count', label: 'Available Cases',         description: 'How many cases of a type are unassigned',   category: 'query'  },
  { id: 'readiness',       label: 'Event Readiness',         description: 'Get the readiness score for an event',       category: 'query'  },
];

const STAGE_LABELS: Record<Stage, string> = {
  invoice: 'Invoice', charging: 'Charging', prepped: 'Prepped', loaded: 'Loaded',
};

// ─── Shared select style ──────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#ffffff',
  fontFamily: 'var(--font-urbanist)',
  fontWeight: 200,
  fontSize: '13px',
  padding: '10px 12px',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  background: 'rgba(255,255,255,0.03)',
};

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', marginBottom: '6px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Result box ───────────────────────────────────────────────────────────────

function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(120,200,140,0.06)', border: '1px solid rgba(120,200,140,0.15)', padding: '14px 16px', marginTop: '8px' }}>
      <div style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(120,200,140,0.9)', fontFamily: 'var(--font-urbanist)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: PalettePrefill | null;
}

export default function CommandPalette({ open, onClose, prefill }: Props) {
  const router = useRouter();
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [cases, setCases] = useState<InventoryCase[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Load reference data once ──
  useEffect(() => {
    if (open && !dataLoaded) {
      Promise.all([
        supabase.from('events').select('id,name,primary_shop,google_doc_url').is('archived_at', null).order('created_at', { ascending: false }),
        supabase.from('inventory_cases').select('*').order('sort_order'),
      ]).then(([evRes, caseRes]) => {
        if (evRes.data) setEvents(evRes.data as Event[]);
        if (caseRes.data) setCases(caseRes.data as InventoryCase[]);
        setDataLoaded(true);
      });
    }
  }, [open, dataLoaded]);

  // ── Apply prefill ──
  useEffect(() => {
    if (open && prefill?.commandId) {
      setSelectedCommand(prefill.commandId);
    }
  }, [open, prefill]);

  // ── Escape to close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function handleClose() {
    setSelectedCommand(null);
    onClose();
  }

  function handleBack() {
    setSelectedCommand(null);
  }

  const cmd = COMMANDS.find(c => c.id === selectedCommand);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(7,12,14,0.88)', backdropFilter: 'blur(12px)' }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg"
            style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.08)' }}
            initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                {selectedCommand && (
                  <button onClick={handleBack} className="flex items-center gap-1 transition-opacity hover:opacity-60"
                    style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.15em' }}>
                    <ChevronLeft size={11} strokeWidth={1.5} />
                  </button>
                )}
                <span style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)', fontWeight: 300 }}>
                  {cmd ? cmd.label : 'Command Palette'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)', letterSpacing: '0.1em' }}>⌘K</span>
                <button onClick={handleClose} className="transition-opacity hover:opacity-60" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <AnimatePresence mode="wait">
                {!selectedCommand ? (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                    {/* Actions */}
                    <CommandSection title="Actions" commands={COMMANDS.filter(c => c.category === 'action')} onSelect={setSelectedCommand} />
                    <div className="mt-5">
                      <CommandSection title="Queries" commands={COMMANDS.filter(c => c.category === 'query')} onSelect={setSelectedCommand} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key={selectedCommand} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <CommandForm
                      commandId={selectedCommand}
                      events={events}
                      cases={cases}
                      prefill={prefill}
                      onClose={handleClose}
                      router={router}
                      onDataRefresh={() => setDataLoaded(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Command grid section ─────────────────────────────────────────────────────

function CommandSection({ title, commands, onSelect }: { title: string; commands: CommandDef[]; onSelect: (id: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '10px' }}>
        {title}
      </div>
      <div className="space-y-px">
        {commands.map(cmd => (
          <button key={cmd.id} onClick={() => onSelect(cmd.id)}
            className="w-full text-left flex items-center justify-between px-3 py-3 transition-all group"
            style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.04em' }}>
                {cmd.label}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', marginTop: '1px' }}>
                {cmd.description}
              </div>
            </div>
            <ArrowRight size={11} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
              className="transition-transform group-hover:translate-x-0.5 duration-150" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Command form router ──────────────────────────────────────────────────────

interface FormProps {
  commandId: string;
  events: Event[];
  cases: InventoryCase[];
  prefill?: PalettePrefill | null;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  onDataRefresh: () => void;
}

function CommandForm(props: FormProps) {
  switch (props.commandId) {
    case 'create-event':     return <CreateEventForm {...props} />;
    case 'move-case':        return <MoveCaseForm {...props} />;
    case 'transfer-case':    return <TransferCaseForm {...props} />;
    case 'remove-case':      return <RemoveCaseForm {...props} />;
    case 'attach-doc':       return <AttachDocForm {...props} />;
    case 'duplicate-event':  return <DuplicateEventForm {...props} />;
    case 'process-return':   return <ProcessReturnForm {...props} />;
    case 'where-is-case':    return <WhereIsCaseForm {...props} />;
    case 'cases-at-event':   return <CasesAtEventForm {...props} />;
    case 'cases-at-shop':    return <CasesAtShopForm {...props} />;
    case 'available-count':  return <AvailableCountForm {...props} />;
    case 'readiness':        return <ReadinessForm {...props} />;
    default: return null;
  }
}

// ─── Run button ───────────────────────────────────────────────────────────────

function RunButton({ onClick, loading, label = 'Run', disabled = false }: { onClick: () => void; loading: boolean; label?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="flex items-center gap-2 px-5 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-70 disabled:opacity-40"
      style={{ border: '1px solid rgba(255,255,255,0.25)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
      {loading && <Loader2 size={10} className="animate-spin" />}
      {label}
    </button>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 mt-4">
      <CheckCircle size={13} style={{ color: 'rgba(120,200,140,0.8)' }} />
      <span style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(120,200,140,0.8)', fontFamily: 'var(--font-urbanist)' }}>
        {message}
      </span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Individual command forms
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Create Event
function CreateEventForm({ router, onClose }: FormProps) {
  const [name, setName] = useState('');
  const [shop, setShop] = useState<Shop>('Orlando');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function run() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('events').insert({
        name: name.trim(), primary_shop: shop,
        location: location.trim() || null,
        event_start_date: startDate || null,
        last_updated_by: 'Guest User', last_updated_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => { onClose(); router.push(`/events/${data.id}`); }, 900);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Event Name">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wedding at Hilton" style={inputStyle} />
      </Field>
      <Field label="Shop">
        <select value={shop} onChange={e => setShop(e.target.value as Shop)} style={selectStyle}>
          {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Location (optional)">
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Venue name or city" style={inputStyle} />
      </Field>
      <Field label="Start Date (optional)">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Create Event" disabled={!name.trim()} />
        {success && <SuccessMessage message="Event created — opening…" />}
      </div>
    </div>
  );
}

// 2. Move Case to Stage
function MoveCaseForm({ events, cases, prefill, onDataRefresh }: FormProps) {
  const [eventId, setEventId] = useState(prefill?.eventId ?? '');
  const [caseId, setCaseId] = useState('');
  const [stage, setStage] = useState<Stage>('invoice');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function run() {
    if (!eventId || !caseId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_cards')
        .update({ stage, last_updated_by: 'Guest User', last_updated_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .eq('inventory_case_id', caseId);
      if (error) throw error;
      setSuccess(true);
      onDataRefresh();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Event">
        <select value={eventId} onChange={e => setEventId(e.target.value)} style={selectStyle}>
          <option value="">Select event…</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </Field>
      <Field label="Case">
        <select value={caseId} onChange={e => setCaseId(e.target.value)} style={selectStyle}>
          <option value="">Select case…</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.type} {c.letter} ({c.shop})</option>)}
        </select>
      </Field>
      <Field label="Move to Stage">
        <select value={stage} onChange={e => setStage(e.target.value as Stage)} style={selectStyle}>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Move Case" disabled={!eventId || !caseId} />
        {success && <SuccessMessage message={`Case moved to ${STAGE_LABELS[stage]}.`} />}
      </div>
    </div>
  );
}

// 3. Transfer Case to Shop
function TransferCaseForm({ cases, onDataRefresh }: FormProps) {
  const [caseId, setCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const selectedCase = cases.find(c => c.id === caseId);
  const toShop: Shop = selectedCase?.shop === 'Orlando' ? 'Dallas' : 'Orlando';

  async function run() {
    if (!caseId || !selectedCase) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('inventory_cases')
        .update({ shop: toShop, last_updated_by: 'Guest User', last_updated_at: new Date().toISOString() })
        .eq('id', caseId);
      if (error) throw error;
      setSuccess(`${selectedCase.type} ${selectedCase.letter} transferred to ${toShop}.`);
      setCaseId('');
      onDataRefresh();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Case to Transfer">
        <select value={caseId} onChange={e => setCaseId(e.target.value)} style={selectStyle}>
          <option value="">Select case…</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.type} {c.letter} — currently {c.shop}</option>)}
        </select>
      </Field>
      {selectedCase && (
        <div style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-urbanist)' }}>
          Will transfer from <span style={{ color: '#fff' }}>{selectedCase.shop}</span> → <span style={{ color: '#fff' }}>{toShop}</span>
        </div>
      )}
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label={selectedCase ? `Transfer to ${toShop}` : 'Transfer'} disabled={!caseId} />
        {success && <SuccessMessage message={success} />}
      </div>
    </div>
  );
}

// 4. Remove Case from Event
function RemoveCaseForm({ events, cases, prefill, onDataRefresh }: FormProps) {
  const [eventId, setEventId] = useState(prefill?.eventId ?? '');
  const [caseId, setCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function run() {
    if (!eventId || !caseId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('event_cards')
        .update({ stage: null, last_updated_by: 'Guest User', last_updated_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .eq('inventory_case_id', caseId);
      if (error) throw error;
      setSuccess(true);
      onDataRefresh();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Event">
        <select value={eventId} onChange={e => setEventId(e.target.value)} style={selectStyle}>
          <option value="">Select event…</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </Field>
      <Field label="Case">
        <select value={caseId} onChange={e => setCaseId(e.target.value)} style={selectStyle}>
          <option value="">Select case…</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.type} {c.letter}</option>)}
        </select>
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Remove Case" disabled={!eventId || !caseId} />
        {success && <SuccessMessage message="Case removed from event." />}
      </div>
    </div>
  );
}

// 5. Attach Doc to Event
function AttachDocForm({ events, prefill, onDataRefresh }: FormProps) {
  const [eventId, setEventId] = useState(prefill?.eventId ?? '');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function run() {
    if (!eventId || !url.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ google_doc_url: url.trim(), last_updated_by: 'Guest User', last_updated_at: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;
      setSuccess(true);
      onDataRefresh();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Event">
        <select value={eventId} onChange={e => setEventId(e.target.value)} style={selectStyle}>
          <option value="">Select event…</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </Field>
      <Field label="Document URL">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/…" style={inputStyle} />
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Attach Doc" disabled={!eventId || !url.trim()} />
        {success && <SuccessMessage message="Document attached to event." />}
      </div>
    </div>
  );
}

// 6. Duplicate Event
function DuplicateEventForm({ events, onDataRefresh, router, onClose }: FormProps) {
  const [sourceEventId, setSourceEventId] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const sourceEvent = events.find(e => e.id === sourceEventId);

  useEffect(() => {
    if (sourceEvent) setNewName(`${sourceEvent.name} (copy)`);
  }, [sourceEvent]);

  async function run() {
    if (!sourceEventId || !newName.trim()) return;
    setLoading(true);
    try {
      // Duplicate event
      const { data: newEvent, error: evErr } = await supabase
        .from('events')
        .insert({ name: newName.trim(), primary_shop: sourceEvent?.primary_shop, last_updated_by: 'Guest User', last_updated_at: new Date().toISOString() })
        .select().single();
      if (evErr) throw evErr;

      // Duplicate event_cards
      const { data: cards } = await supabase.from('event_cards').select('*').eq('event_id', sourceEventId);
      if (cards && cards.length > 0) {
        const newCards = cards.map(({ id: _id, created_at: _ca, updated_at: _ua, event_id: _ei, ...rest }: Record<string, unknown>) => ({
          ...rest,
          event_id: newEvent.id,
          last_updated_by: 'Guest User',
          last_updated_at: new Date().toISOString(),
        }));
        await supabase.from('event_cards').insert(newCards);
      }

      setSuccess(true);
      onDataRefresh();
      setTimeout(() => { onClose(); router.push(`/events/${newEvent.id}`); }, 900);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Source Event">
        <select value={sourceEventId} onChange={e => setSourceEventId(e.target.value)} style={selectStyle}>
          <option value="">Select event to duplicate…</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </Field>
      <Field label="New Event Name">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New event name…" style={inputStyle} />
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Duplicate Event" disabled={!sourceEventId || !newName.trim()} />
        {success && <SuccessMessage message="Event duplicated — opening…" />}
      </div>
    </div>
  );
}

// 7. Process Return
function ProcessReturnForm({ events, router, onClose }: FormProps) {
  const [eventId, setEventId] = useState('');

  function run() {
    if (!eventId) return;
    onClose();
    router.push(`/return/${eventId}`);
  }

  return (
    <div className="space-y-4">
      <Field label="Event">
        <select value={eventId} onChange={e => setEventId(e.target.value)} style={selectStyle}>
          <option value="">Select event…</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </Field>
      <div style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', lineHeight: 1.7 }}>
        Opens the return processing flow where you can mark each case as returned OK, note damage, or report missing lights.
      </div>
      <div className="pt-2">
        <RunButton onClick={run} loading={false} label="Start Return" disabled={!eventId} />
      </div>
    </div>
  );
}

// 8. Where is this case?
function WhereIsCaseForm({ cases }: FormProps) {
  const [caseId, setCaseId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!caseId) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await supabase
        .from('event_cards')
        .select('stage, event:events(id,name)')
        .eq('inventory_case_id', caseId)
        .not('stage', 'is', null)
        .maybeSingle();

      const c = cases.find(x => x.id === caseId)!;
      if (data && data.event) {
        const ev = data.event as unknown as Event;
        setResult(`${c.type} ${c.letter} is assigned to "${ev.name}" in the ${data.stage} stage. Currently at ${c.shop}.`);
      } else {
        setResult(`${c.type} ${c.letter} is unassigned — available at ${c.shop}.`);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Case">
        <select value={caseId} onChange={e => { setCaseId(e.target.value); setResult(null); }} style={selectStyle}>
          <option value="">Select case…</option>
          {cases.map(c => <option key={c.id} value={c.id}>{c.type} {c.letter} ({c.shop})</option>)}
        </select>
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Find Case" disabled={!caseId} />
      </div>
      {result && <ResultBox>{result}</ResultBox>}
    </div>
  );
}

// 9. Cases at Event
function CasesAtEventForm({ events }: FormProps) {
  const [eventId, setEventId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!eventId) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await supabase
        .from('event_cards')
        .select('stage, inventory_case:inventory_cases(type, letter, shop)')
        .eq('event_id', eventId)
        .not('stage', 'is', null);

      const ev = events.find(e => e.id === eventId)!;
      if (!data || data.length === 0) {
        setResult(`No cases assigned to "${ev.name}".`);
      } else {
        const byStage: Record<string, number> = {};
        data.forEach((row: { stage: string }) => { byStage[row.stage] = (byStage[row.stage] ?? 0) + 1; });
        const stageBreakdown = Object.entries(byStage).map(([s, n]) => `${n} ${s}`).join(', ');
        setResult(`"${ev.name}" has ${data.length} case${data.length !== 1 ? 's' : ''} assigned (${stageBreakdown}).`);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Event">
        <select value={eventId} onChange={e => { setEventId(e.target.value); setResult(null); }} style={selectStyle}>
          <option value="">Select event…</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Query" disabled={!eventId} />
      </div>
      {result && <ResultBox>{result}</ResultBox>}
    </div>
  );
}

// 10. Cases at Shop
function CasesAtShopForm({ cases }: FormProps) {
  const [shop, setShop] = useState<Shop>('Orlando');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const shopCases = cases.filter(c => c.shop === shop);

      // Check which ones are assigned
      const { data: cards } = await supabase
        .from('event_cards')
        .select('inventory_case_id')
        .in('inventory_case_id', shopCases.map(c => c.id))
        .not('stage', 'is', null);

      const assignedIds = new Set((cards ?? []).map((r: { inventory_case_id: string }) => r.inventory_case_id));
      const assigned = shopCases.filter(c => assignedIds.has(c.id)).length;
      const available = shopCases.length - assigned;

      setResult(`${shop} has ${shopCases.length} case${shopCases.length !== 1 ? 's' : ''} total — ${available} available, ${assigned} assigned to events.`);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Shop">
        <select value={shop} onChange={e => { setShop(e.target.value as Shop); setResult(null); }} style={selectStyle}>
          {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Query" />
      </div>
      {result && <ResultBox>{result}</ResultBox>}
    </div>
  );
}

// 11. Available Cases by Type
function AvailableCountForm({ cases }: FormProps) {
  const types = [...new Set(cases.map(c => c.type))].sort();
  const [type, setType] = useState(types[0] ?? '');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!type) return;
    setLoading(true);
    setResult(null);
    try {
      const typeCases = cases.filter(c => c.type === type);

      const { data: cards } = await supabase
        .from('event_cards')
        .select('inventory_case_id')
        .in('inventory_case_id', typeCases.map(c => c.id))
        .not('stage', 'is', null);

      const assignedIds = new Set((cards ?? []).map((r: { inventory_case_id: string }) => r.inventory_case_id));
      const available = typeCases.filter(c => !assignedIds.has(c.id));
      const byShop = SHOPS.map(s => `${available.filter(c => c.shop === s).length} in ${s}`).join(', ');

      setResult(
        available.length === 0
          ? `All ${typeCases.length} ${type} case${typeCases.length !== 1 ? 's' : ''} are currently assigned.`
          : `${available.length} of ${typeCases.length} ${type} case${typeCases.length !== 1 ? 's' : ''} are available (${byShop}).`
      );
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Case Type">
        <select value={type} onChange={e => { setType(e.target.value); setResult(null); }} style={selectStyle}>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Query" disabled={!type} />
      </div>
      {result && <ResultBox>{result}</ResultBox>}
    </div>
  );
}

// 12. Event Readiness
function ReadinessForm({ events }: FormProps) {
  const [eventId, setEventId] = useState('');
  const [result, setResult] = useState<{ score: number; breakdown: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!eventId) return;
    setLoading(true);
    setResult(null);
    try {
      const { data: cards } = await supabase
        .from('event_cards')
        .select('stage')
        .eq('event_id', eventId)
        .not('stage', 'is', null);

      const ev = events.find(e => e.id === eventId)!;
      if (!cards || cards.length === 0) {
        setResult({ score: 0, breakdown: `No cases assigned to "${ev.name}" yet.` });
        return;
      }

      const weights: Record<string, number> = { invoice: 0, charging: 33, prepped: 66, loaded: 100 };
      const total = cards.reduce((s: number, c: { stage: string }) => s + (weights[c.stage] ?? 0), 0);
      const score = Math.round(total / cards.length);

      const stageCounts: Record<string, number> = {};
      cards.forEach((c: { stage: string }) => { stageCounts[c.stage] = (stageCounts[c.stage] ?? 0) + 1; });
      const breakdown = Object.entries(stageCounts).map(([s, n]) => `${n} ${s}`).join(', ');

      setResult({ score, breakdown: `${breakdown} — overall readiness ${score}%` });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const scoreColor = result
    ? result.score >= 80 ? 'rgba(120,200,140,0.9)'
      : result.score >= 40 ? 'rgba(210,160,80,0.9)'
      : 'rgba(220,100,80,0.9)'
    : 'rgba(120,200,140,0.9)';

  return (
    <div className="space-y-4">
      <Field label="Event">
        <select value={eventId} onChange={e => { setEventId(e.target.value); setResult(null); }} style={selectStyle}>
          <option value="">Select event…</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </Field>
      <div className="pt-2">
        <RunButton onClick={run} loading={loading} label="Get Readiness" disabled={!eventId} />
      </div>
      {result && (
        <ResultBox>
          <div className="flex items-center gap-3 mb-1">
            <span style={{ fontSize: '28px', fontWeight: 100, color: scoreColor, fontFamily: 'var(--font-josefin)', lineHeight: 1 }}>
              {result.score}%
            </span>
          </div>
          <div>{result.breakdown}</div>
        </ResultBox>
      )}
    </div>
  );
}
