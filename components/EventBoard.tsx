'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, MapPin, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Event, InventoryCase, EventCard, DisplayCard, Stage, STAGES } from '@/lib/types';
import { playCardMove } from '@/lib/sounds';
import ProgressBar from './ProgressBar';
import StageColumn from './StageColumn';
import InventoryPool from './InventoryPool';
import CardDetailSheet from './CardDetailSheet';
import CreateCustomCardModal from './CreateCustomCardModal';
import Logo from './Logo';
import Link from 'next/link';
import { STAGE_COLORS } from '@/lib/caseColors';

interface EventBoardProps { eventId: string; }

type MobileTab = Stage | 'pool';

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: 'pool', label: 'Pool' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'charging', label: 'Charging' },
  { id: 'prepped', label: 'Prepped' },
  { id: 'loaded', label: 'Loaded' },
];

function buildDisplayCards(inventoryCases: InventoryCase[], eventCards: EventCard[]): DisplayCard[] {
  const result: DisplayCard[] = [];
  for (const ic of inventoryCases) {
    const ec = eventCards.find(e => e.inventory_case_id === ic.id);
    result.push({
      displayId: `inv-${ic.id}`, inventoryCaseId: ic.id, eventCardId: ec?.id,
      type: ic.type, letter: ic.letter, displayName: `${ic.type} ${ic.letter}`,
      isCustom: false, stage: ec?.stage ?? null,
      notes: ec?.notes, approved_by: ec?.approved_by, prepped_by: ec?.prepped_by,
      images: ec?.images ?? [],
    });
  }
  for (const ec of eventCards.filter(e => e.is_custom)) {
    result.push({
      displayId: `custom-${ec.id}`, eventCardId: ec.id,
      type: 'Custom', letter: '', displayName: ec.custom_name ?? 'Custom',
      isCustom: true, customColor: ec.custom_color, stage: ec.stage ?? null,
      notes: ec.notes, approved_by: ec.approved_by, prepped_by: ec.prepped_by,
      images: ec.images ?? [],
    });
  }
  return result;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EventBoard({ eventId }: EventBoardProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [displayCards, setDisplayCards] = useState<DisplayCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<DisplayCard | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('pool');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventRes, casesRes, cardsRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('inventory_cases').select('*').order('sort_order'),
        supabase.from('event_cards').select('*, images:event_card_images(*)').eq('event_id', eventId),
      ]);
      if (eventRes.error) throw eventRes.error;
      setEvent(eventRes.data);
      setDisplayCards(buildDisplayCards(casesRes.data as InventoryCase[], cardsRes.data as EventCard[]));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleCardUpdated(updates: Partial<DisplayCard> & { eventCardId: string }) {
    setDisplayCards(prev => prev.map(card => {
      // Match by eventCardId when both have one (normal case)
      if (card.eventCardId && card.eventCardId === updates.eventCardId) return { ...card, ...updates };
      // Match by displayId when this card doesn't have an eventCardId yet (new card being saved for the first time)
      if (!card.eventCardId && updates.displayId && card.displayId === updates.displayId) return { ...card, ...updates };
      return card;
    }));
    setSelectedCard(prev => prev ? { ...prev, ...updates } : prev);
  }

  function handleCardMoved(movedCard: DisplayCard, newStage: Stage | null) {
    playCardMove();
    setDisplayCards(prev => prev.map(card =>
      card.displayId === movedCard.displayId ? { ...card, eventCardId: movedCard.eventCardId, stage: newStage } : card
    ));
  }

  const stageCards = (stage: Stage) =>
    displayCards.filter(c => c.stage === stage).sort((a, b) => a.displayName.localeCompare(b.displayName));

  const poolCards = displayCards.filter(c => !c.stage).sort((a, b) => {
    if (a.isCustom && !b.isCustom) return 1;
    if (!a.isCustom && b.isCustom) return -1;
    return a.displayName.localeCompare(b.displayName);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070c0e' }}>
        <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070c0e' }}>
        <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>Event not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
        style={{
          background: 'rgba(7,12,14,0.96)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 transition-opacity hover:opacity-50">
            <ChevronLeft size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </Link>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <Logo size="sm" asLink={false} />
        </div>

        <button
          onClick={() => setIsCustomModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-[0.22em] uppercase font-light transition-opacity hover:opacity-50"
          style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-josefin)' }}
        >
          <Plus size={10} strokeWidth={1.5} />
          <span className="hidden sm:inline">Custom</span>
        </button>
      </header>

      {/* Event header */}
      <div className="px-5 pt-7 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="text-[9px] tracking-[0.3em] uppercase font-light mb-2" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
          Event
        </div>
        <h1
          className="text-2xl font-light tracking-[0.04em]"
          style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
        >
          {event.name}
        </h1>
        {(event.location || event.event_start_date || event.load_by_date) && (
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {event.location && (
              <span className="flex items-center gap-1.5 text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                <MapPin size={10} strokeWidth={1.5} />{event.location}
              </span>
            )}
            {event.event_start_date && (
              <span className="flex items-center gap-1.5 text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                <Calendar size={10} strokeWidth={1.5} />{formatDate(event.event_start_date)}
              </span>
            )}
            {event.load_by_date && (
              <span className="text-[9px] tracking-[0.15em] uppercase font-light" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                Load {formatDate(event.load_by_date)}
              </span>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="mt-5">
          <ProgressBar cards={displayCards} />
        </div>
      </div>

      {/* Mobile tabs */}
      <div
        className="lg:hidden sticky z-20 px-5 py-3 overflow-x-auto"
        style={{ top: '57px', background: 'rgba(7,12,14,0.97)', borderBottom: '1px solid rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex gap-1 min-w-max">
          {MOBILE_TABS.map(tab => {
            const isActive = mobileTab === tab.id;
            const sc = tab.id !== 'pool' ? STAGE_COLORS[tab.id as Stage] : null;
            const count = tab.id === 'pool' ? poolCards.length : stageCards(tab.id as Stage).length;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className="px-3.5 py-2 text-[9px] tracking-[0.2em] uppercase font-light transition-all whitespace-nowrap flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--font-josefin)',
                  color: isActive ? (sc ? sc.accent : 'rgba(255,255,255,0.7)') : 'rgba(255,255,255,0.22)',
                  borderBottom: isActive ? `1px solid ${sc ? sc.accent : 'rgba(255,255,255,0.4)'}` : '1px solid transparent',
                  paddingBottom: '9px',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{ color: isActive ? (sc ? sc.accent : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.15)' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Board */}
      <div className="p-5">
        {/* Mobile */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileTab}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {mobileTab === 'pool'
                ? <InventoryPool cards={poolCards} onCardClick={c => { setSelectedCard(c); setIsSheetOpen(true); }} />
                : <StageColumn stage={mobileTab as Stage} cards={stageCards(mobileTab as Stage)} onCardClick={c => { setSelectedCard(c); setIsSheetOpen(true); }} />
              }
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop */}
        <div className="hidden lg:block space-y-10">
          <div className="grid grid-cols-4 gap-6">
            {STAGES.map(stage => (
              <StageColumn key={stage} stage={stage} cards={stageCards(stage)} onCardClick={c => { setSelectedCard(c); setIsSheetOpen(true); }} />
            ))}
          </div>
          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <InventoryPool cards={poolCards} onCardClick={c => { setSelectedCard(c); setIsSheetOpen(true); }} />
          </div>
        </div>
      </div>

      <CardDetailSheet
        card={selectedCard}
        eventId={eventId}
        isOpen={isSheetOpen}
        onClose={() => { setIsSheetOpen(false); setTimeout(() => setSelectedCard(null), 300); }}
        onCardUpdated={handleCardUpdated}
        onCardMoved={handleCardMoved}
      />

      <CreateCustomCardModal
        isOpen={isCustomModalOpen}
        eventId={eventId}
        onClose={() => setIsCustomModalOpen(false)}
        onCreated={card => setDisplayCards(prev => [...prev, card])}
      />
    </div>
  );
}
