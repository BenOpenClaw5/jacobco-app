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

interface EventBoardProps {
  eventId: string;
}

type MobileTab = Stage | 'pool';

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: 'invoice', label: 'Invoice' },
  { id: 'charging', label: 'Charging' },
  { id: 'prepped', label: 'Prepped' },
  { id: 'loaded', label: 'Loaded' },
  { id: 'pool', label: 'Pool' },
];

function buildDisplayCards(
  inventoryCases: InventoryCase[],
  eventCards: EventCard[]
): DisplayCard[] {
  const result: DisplayCard[] = [];

  // Real inventory cards
  for (const ic of inventoryCases) {
    const ec = eventCards.find(e => e.inventory_case_id === ic.id);
    result.push({
      displayId: `inv-${ic.id}`,
      inventoryCaseId: ic.id,
      eventCardId: ec?.id,
      type: ic.type,
      letter: ic.letter,
      displayName: `${ic.type} ${ic.letter}`,
      isCustom: false,
      stage: ec?.stage ?? null,
      notes: ec?.notes,
      approved_by: ec?.approved_by,
      prepped_by: ec?.prepped_by,
      images: ec?.images ?? [],
    });
  }

  // Custom cards
  for (const ec of eventCards.filter(e => e.is_custom)) {
    result.push({
      displayId: `custom-${ec.id}`,
      eventCardId: ec.id,
      type: 'Custom',
      letter: '',
      displayName: ec.custom_name ?? 'Custom',
      isCustom: true,
      customColor: ec.custom_color,
      stage: ec.stage ?? null,
      notes: ec.notes,
      approved_by: ec.approved_by,
      prepped_by: ec.prepped_by,
      images: ec.images ?? [],
    });
  }

  return result;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EventBoard({ eventId }: EventBoardProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [displayCards, setDisplayCards] = useState<DisplayCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<DisplayCard | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('invoice');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventRes, casesRes, cardsRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('inventory_cases').select('*').order('sort_order'),
        supabase
          .from('event_cards')
          .select('*, images:event_card_images(*)')
          .eq('event_id', eventId),
      ]);

      if (eventRes.error) throw eventRes.error;
      if (casesRes.error) throw casesRes.error;
      if (cardsRes.error) throw cardsRes.error;

      setEvent(eventRes.data);
      const cards = buildDisplayCards(
        casesRes.data as InventoryCase[],
        cardsRes.data as EventCard[]
      );
      setDisplayCards(cards);
    } catch (err) {
      console.error('Failed to load board:', err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCard(card: DisplayCard) {
    setSelectedCard(card);
    setIsSheetOpen(true);
  }

  function handleCardUpdated(updates: Partial<DisplayCard> & { eventCardId: string }) {
    setDisplayCards(prev =>
      prev.map(card => {
        const matches = card.eventCardId === updates.eventCardId ||
          (!card.eventCardId && updates.eventCardId);
        if (!matches) return card;
        return {
          ...card,
          eventCardId: updates.eventCardId,
          notes: updates.notes ?? card.notes,
          approved_by: updates.approved_by ?? card.approved_by,
          prepped_by: updates.prepped_by ?? card.prepped_by,
          images: updates.images ?? card.images,
        };
      })
    );
    // Update selected card if open
    setSelectedCard(prev => {
      if (!prev) return prev;
      const matches = prev.eventCardId === updates.eventCardId ||
        (!prev.eventCardId && updates.eventCardId);
      if (!matches) return prev;
      return {
        ...prev,
        eventCardId: updates.eventCardId,
        notes: updates.notes ?? prev.notes,
        approved_by: updates.approved_by ?? prev.approved_by,
        prepped_by: updates.prepped_by ?? prev.prepped_by,
        images: updates.images ?? prev.images,
      };
    });
  }

  function handleCardMoved(movedCard: DisplayCard, newStage: Stage | null) {
    playCardMove();
    setDisplayCards(prev =>
      prev.map(card => {
        if (card.displayId !== movedCard.displayId) return card;
        return {
          ...card,
          eventCardId: movedCard.eventCardId,
          stage: newStage,
        };
      })
    );
  }

  function handleCustomCardCreated(card: DisplayCard) {
    setDisplayCards(prev => [...prev, card]);
  }

  const stageCards = (stage: Stage) =>
    displayCards
      .filter(c => c.stage === stage)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const poolCards = displayCards
    .filter(c => !c.stage)
    .sort((a, b) => {
      if (a.isCustom && !b.isCustom) return 1;
      if (!a.isCustom && b.isCustom) return -1;
      return a.displayName.localeCompare(b.displayName);
    });

  const allStagedCards = displayCards.filter(c => c.stage !== null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080A' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin" style={{ color: 'rgba(196,163,90,0.6)' }} />
          <span className="text-sm tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Loading board
          </span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080A' }}>
        <div className="text-center">
          <p className="text-lg mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Event not found</p>
          <Link href="/" className="text-sm" style={{ color: '#C4A35A' }}>← Back to events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#08080A' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-4"
        style={{
          background: 'rgba(8,8,10,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link href="/" className="flex items-center gap-1.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ChevronLeft size={16} />
          <span className="text-xs tracking-wide hidden sm:inline">Events</span>
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate" style={{ color: '#F0EFE8' }}>
            {event.name}
          </h1>
          {(event.location || event.event_start_date) && (
            <div className="flex items-center gap-3 mt-0.5">
              {event.location && (
                <span className="text-xs truncate flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <MapPin size={9} />
                  {event.location}
                </span>
              )}
              {event.event_start_date && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <Calendar size={9} />
                  {formatDate(event.event_start_date)}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCustomModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Custom</span>
        </button>
      </header>

      {/* Progress bar */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <ProgressBar cards={[...allStagedCards, ...poolCards]} />
      </div>

      {/* Mobile tab bar */}
      <div
        className="lg:hidden sticky z-20 px-4 py-2 overflow-x-auto"
        style={{
          top: '57px',
          background: 'rgba(8,8,10,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex gap-1.5 min-w-max">
          {MOBILE_TABS.map(tab => {
            const isActive = mobileTab === tab.id;
            const stageColor = tab.id !== 'pool' ? STAGE_COLORS[tab.id as Stage] : null;
            const count = tab.id === 'pool'
              ? poolCards.length
              : stageCards(tab.id as Stage).length;

            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                style={{
                  background: isActive
                    ? (stageColor ? `${stageColor.accent}20` : 'rgba(255,255,255,0.08)')
                    : 'transparent',
                  color: isActive
                    ? (stageColor ? stageColor.accent : 'rgba(255,255,255,0.6)')
                    : 'rgba(255,255,255,0.3)',
                  border: isActive
                    ? `1px solid ${stageColor ? stageColor.accent + '30' : 'rgba(255,255,255,0.12)'}`
                    : '1px solid transparent',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="text-[10px] px-1 py-0.5 rounded-md"
                    style={{
                      background: isActive
                        ? (stageColor ? `${stageColor.accent}30` : 'rgba(255,255,255,0.15)')
                        : 'rgba(255,255,255,0.08)',
                      color: isActive
                        ? (stageColor ? stageColor.accent : 'rgba(255,255,255,0.5)')
                        : 'rgba(255,255,255,0.25)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Board content */}
      <div className="p-4">
        {/* Mobile: single column view */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {mobileTab === 'pool' ? (
                <InventoryPool cards={poolCards} onCardClick={openCard} />
              ) : (
                <StageColumn
                  stage={mobileTab as Stage}
                  cards={stageCards(mobileTab as Stage)}
                  onCardClick={openCard}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop: all columns */}
        <div className="hidden lg:block">
          {/* Stages row */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {STAGES.map(stage => (
              <StageColumn
                key={stage}
                stage={stage}
                cards={stageCards(stage)}
                onCardClick={openCard}
              />
            ))}
          </div>

          {/* Inventory pool */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <InventoryPool cards={poolCards} onCardClick={openCard} />
          </div>
        </div>
      </div>

      {/* Card detail sheet */}
      <CardDetailSheet
        card={selectedCard}
        eventId={eventId}
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setTimeout(() => setSelectedCard(null), 300);
        }}
        onCardUpdated={handleCardUpdated}
        onCardMoved={handleCardMoved}
      />

      {/* Create custom card modal */}
      <CreateCustomCardModal
        isOpen={isCustomModalOpen}
        eventId={eventId}
        onClose={() => setIsCustomModalOpen(false)}
        onCreated={handleCustomCardCreated}
      />
    </div>
  );
}
