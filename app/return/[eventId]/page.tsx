'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle, AlertTriangle, FileText, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Event, EventCard, InventoryCase } from '@/lib/types';
import Logo from '@/components/Logo';

type ReturnStatus = 'ok' | 'missing' | 'note' | null;

interface CardReturn {
  eventCardId: string;
  inventoryCaseId: string;
  displayName: string;
  standard: number;
  actual: number;
  status: ReturnStatus;
  missingCount: string;
  note: string;
}

export default function ReturnPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();

  const [event, setEvent]     = useState<Event | null>(null);
  const [cards, setCards]     = useState<CardReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);

  const load = useCallback(async () => {
    const [evRes, cardsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('event_cards')
        .select('*, inventory_case:inventory_cases(*)')
        .eq('event_id', eventId)
        .not('inventory_case_id', 'is', null),
    ]);
    if (!evRes.error) setEvent(evRes.data as Event);
    if (!cardsRes.error) {
      setCards(
        (cardsRes.data as (EventCard & { inventory_case: InventoryCase })[])
          .filter(c => c.inventory_case)
          .map(c => ({
            eventCardId:      c.id,
            inventoryCaseId:  c.inventory_case_id!,
            displayName:      `${c.inventory_case.type} ${c.inventory_case.letter}`,
            standard:         c.inventory_case.standard_light_count ?? 0,
            actual:           c.inventory_case.actual_light_count ?? c.inventory_case.standard_light_count ?? 0,
            status:           null,
            missingCount:     '',
            note:             '',
          }))
      );
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  function update(id: string, patch: Partial<CardReturn>) {
    setCards(prev => prev.map(c => c.eventCardId === id ? { ...c, ...patch } : c));
  }

  async function handleSubmit() {
    const incomplete = cards.filter(c => c.status === null);
    if (incomplete.length > 0) {
      alert(`Please mark all ${incomplete.length} remaining case(s) before submitting.`);
      return;
    }
    setSubmitting(true);
    try {
      for (const card of cards) {
        if (card.status === 'ok') {
          // Remove from event, mark available
          await supabase.from('event_cards').delete().eq('id', card.eventCardId);
          await supabase.from('inventory_cases').update({
            last_updated_by: 'Guest User',
            last_updated_at: new Date().toISOString(),
          }).eq('id', card.inventoryCaseId);
          // Record OK incident
          await supabase.from('return_incidents').insert({
            event_id: eventId,
            inventory_case_id: card.inventoryCaseId,
            type: 'ok',
            last_updated_by: 'Guest User',
          });
        } else if (card.status === 'missing') {
          const missing = parseInt(card.missingCount, 10) || 0;
          const newActual = Math.max(0, card.actual - missing);
          // Update case counts, mark issue
          await supabase.from('inventory_cases').update({
            actual_light_count: newActual,
            has_issue: true,
            issue_note: `${missing} light(s) missing after return from ${event?.name ?? eventId}.${card.note ? ' ' + card.note : ''}`,
            last_updated_by: 'Guest User',
            last_updated_at: new Date().toISOString(),
          }).eq('id', card.inventoryCaseId);
          // Remove from event
          await supabase.from('event_cards').delete().eq('id', card.eventCardId);
          // Record incident
          await supabase.from('return_incidents').insert({
            event_id: eventId,
            inventory_case_id: card.inventoryCaseId,
            type: 'missing',
            missing_count: missing,
            note: card.note || null,
            last_updated_by: 'Guest User',
          });
        } else if (card.status === 'note') {
          // Note only — don't touch counts, just record
          await supabase.from('event_cards').delete().eq('id', card.eventCardId);
          await supabase.from('return_incidents').insert({
            event_id: eventId,
            inventory_case_id: card.inventoryCaseId,
            type: 'note',
            note: card.note || 'No details provided.',
            last_updated_by: 'Guest User',
          });
          await supabase.from('inventory_cases').update({
            has_issue: true,
            issue_note: card.note || 'Issue noted on return.',
            last_updated_by: 'Guest User',
            last_updated_at: new Date().toISOString(),
          }).eq('id', card.inventoryCaseId);
        }
      }
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070c0e' }}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(7,12,14,0.97)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-4">
          <Link href={`/events/${eventId}`} className="flex items-center gap-1.5 transition-opacity hover:opacity-50">
            <ChevronLeft size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </Link>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <Logo size="sm" asLink={false} />
        </div>
        <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
          Return Processing
        </span>
      </header>

      {/* Success */}
      <AnimatePresence>
        {done && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(7,12,14,0.95)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="text-center max-w-sm"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="w-px h-12 mx-auto mb-8" style={{ background: 'rgba(120,200,140,0.4)' }} />
              <div style={{ fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(120,200,140,0.7)', fontFamily: 'var(--font-josefin)', marginBottom: '12px' }}>
                Return Processed
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
                All Done
              </h2>
              <p style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', marginBottom: '32px', lineHeight: 1.7 }}>
                Inventory has been updated. Any incidents have been logged.
              </p>
              <div className="flex flex-col gap-2">
                <Link href={`/events/${eventId}`}
                  className="w-full py-3 text-[10px] tracking-[0.3em] uppercase font-light flex items-center justify-center transition-opacity hover:opacity-60"
                  style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
                  Back to Event
                </Link>
                <Link href="/incidents"
                  className="w-full py-2.5 text-[9px] tracking-[0.25em] uppercase font-light flex items-center justify-center transition-opacity hover:opacity-60"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                  View Incidents
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="px-5 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '6px' }}>
          {event?.name ?? '—'}
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
          Process Return
        </h1>
        <p style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', marginTop: '6px' }}>
          Mark each case as returned, note any missing lights, or add a damage note.
        </p>
      </div>

      {/* Cards */}
      <div className="px-5 py-6 max-w-lg space-y-3 pb-32">
        {cards.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
            No inventory cases assigned to this event.
          </div>
        ) : cards.map(card => (
          <ReturnCard key={card.eventCardId} card={card} onUpdate={p => update(card.eventCardId, p)} />
        ))}
      </div>

      {/* Submit bar */}
      {cards.length > 0 && !done && (
        <div className="fixed bottom-0 left-0 right-0 px-5 py-4"
          style={{ background: 'rgba(7,12,14,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>
              {cards.filter(c => c.status !== null).length} / {cards.length} marked
            </span>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 text-[10px] tracking-[0.3em] uppercase font-light transition-opacity"
              style={{
                border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', fontFamily: 'var(--font-josefin)',
                opacity: submitting ? 0.5 : 1,
              }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? 'Processing' : 'Confirm Return'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReturnCard({ card, onUpdate }: { card: CardReturn; onUpdate: (p: Partial<CardReturn>) => void }) {
  const statusColor: Record<string, string> = {
    ok:      'rgba(120,200,140,0.8)',
    missing: 'rgba(220,100,80,0.8)',
    note:    'rgba(220,160,80,0.8)',
  };
  const accent = card.status ? statusColor[card.status] : 'rgba(255,255,255,0.1)';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ border: `1px solid ${accent}`, background: card.status ? `${accent}08` : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div style={{ fontFamily: 'var(--font-josefin)', fontSize: '14px', color: '#ffffff', fontWeight: 300, letterSpacing: '0.04em' }}>
              {card.displayName}
            </div>
            {card.standard > 0 && (
              <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', marginTop: '2px' }}>
                {card.actual}/{card.standard} lights
              </div>
            )}
          </div>
          {card.status && (
            <Check size={14} strokeWidth={2} style={{ color: accent }} />
          )}
        </div>

        {/* Status buttons */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'ok',      label: 'Returned OK',   icon: CheckCircle  },
            { id: 'missing', label: 'Missing Items',  icon: AlertTriangle },
            { id: 'note',    label: 'Note / Issue',   icon: FileText     },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id}
              onClick={() => onUpdate({ status: id as ReturnStatus, missingCount: '', note: '' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] tracking-[0.12em] uppercase font-light transition-all"
              style={{
                fontFamily: 'var(--font-josefin)',
                border: card.status === id ? `1px solid ${statusColor[id]}` : '1px solid rgba(255,255,255,0.1)',
                color: card.status === id ? statusColor[id] : 'rgba(255,255,255,0.3)',
                background: card.status === id ? `${statusColor[id]}12` : 'transparent',
              }}>
              <Icon size={9} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        {/* Conditional fields */}
        <AnimatePresence>
          {card.status === 'missing' && (
            <motion.div key="missing-fields"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3 space-y-3">
              <div>
                <label style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '6px' }}>
                  How many lights missing?
                </label>
                <input type="number" min="0" value={card.missingCount}
                  onChange={e => onUpdate({ missingCount: e.target.value })}
                  placeholder="0"
                  style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '14px', padding: '0 0 6px 0', outline: 'none', width: '80px' }}
                  className="placeholder:opacity-20"
                />
              </div>
              <div>
                <label style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '6px' }}>
                  Note (optional)
                </label>
                <input value={card.note} onChange={e => onUpdate({ note: e.target.value })}
                  placeholder="Additional details"
                  style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '13px', padding: '0 0 6px 0', outline: 'none', width: '100%' }}
                  className="placeholder:opacity-20"
                />
              </div>
            </motion.div>
          )}
          {card.status === 'note' && (
            <motion.div key="note-field"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3">
              <label style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', display: 'block', marginBottom: '6px' }}>
                Describe the issue
              </label>
              <textarea rows={2} value={card.note} onChange={e => onUpdate({ note: e.target.value })}
                placeholder="Describe damage, missing parts, or other issues"
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '13px', padding: '0 0 6px 0', outline: 'none', width: '100%', resize: 'none' }}
                className="placeholder:opacity-20"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
