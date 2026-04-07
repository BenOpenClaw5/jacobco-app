'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, MapPin, Calendar, Loader2, Archive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import GlobalNav from '@/components/GlobalNav';
import CreateEventModal from '@/components/CreateEventModal';
import Link from 'next/link';

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const CONTAINER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

function DeleteConfirm({ event, onConfirm, onCancel, isDeleting }: {
  event: Event; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
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
          Archive Event?
        </h3>
        <p className="text-xs font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          This hides the event from this list but keeps it in calendar history.
        </p>
        <p className="text-sm font-light mb-4" style={{ color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          &quot;{event.name}&quot;
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
            {isDeleting ? 'Archiving' : 'Archive'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const SHOP_COLORS: Record<string, string> = {
  Orlando: 'rgba(100,160,210,0.6)',
  Dallas:  'rgba(210,160,80,0.6)',
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvents(data as Event[]);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }

  async function handleArchiveConfirm() {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      await supabase.from('events').update({ archived_at: new Date().toISOString() }).eq('id', deletingEvent.id);
      setEvents(prev => prev.filter(e => e.id !== deletingEvent.id));
      setDeletingEvent(null);
    } catch (err) { console.error(err); }
    finally { setIsDeleting(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      <GlobalNav />

      <div className="px-6 pt-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 300, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
            Production Board
          </div>
          <div className="flex items-end justify-between gap-4">
            <h1 style={{ fontSize: '28px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
              Events
            </h1>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
              style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
            >
              <Plus size={11} strokeWidth={1.5} />
              New Event
            </button>
          </div>
          {!isLoading && (
            <p style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', marginTop: '6px' }}>
              {events.length} active {events.length === 1 ? 'event' : 'events'}
            </p>
          )}
        </motion.div>
      </div>

      <main className="px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-28">
            <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : events.length === 0 ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : (
          <motion.div className="space-y-px" variants={CONTAINER_VARIANTS} initial="hidden" animate="visible">
            {events.map(event => (
              <EventListCard key={event.id} event={event} onArchive={() => setDeletingEvent(event)} />
            ))}
          </motion.div>
        )}
      </main>

      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={e => setEvents(p => [e, ...p])}
      />

      <AnimatePresence>
        {deletingEvent && (
          <DeleteConfirm event={deletingEvent} onConfirm={handleArchiveConfirm} onCancel={() => setDeletingEvent(null)} isDeleting={isDeleting} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div className="flex flex-col items-center justify-center py-24 text-center"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
      <div className="w-12 h-px mb-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <h3 style={{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.08em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
        No Events
      </h3>
      <p style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', marginBottom: '32px', lineHeight: 1.8, maxWidth: '280px' }}>
        Create your first event to start tracking lighting cases through production stages.
      </p>
      <button onClick={onCreate}
        className="flex items-center gap-2.5 px-7 py-3 text-[10px] tracking-[0.3em] uppercase font-light transition-opacity hover:opacity-60"
        style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
        <Plus size={11} strokeWidth={1.5} />
        Create Event
      </button>
    </motion.div>
  );
}

function EventListCard({ event, onArchive }: { event: Event; onArchive: () => void }) {
  const shopColor = SHOP_COLORS[event.primary_shop ?? 'Orlando'] ?? 'rgba(255,255,255,0.3)';

  return (
    <motion.div variants={CARD_VARIANTS} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="group relative">
      <Link href={`/events/${event.id}`} className="block">
        <motion.div
          className="flex items-center justify-between py-5 px-0 relative"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          whileHover={{ x: 2 }}
          transition={{ duration: 0.12 }}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{ background: 'rgba(255,255,255,0.4)', height: '38%' }} />

          <div className="pl-3 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <h3 style={{ fontSize: '15px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.04em' }}
                className="truncate">
                {event.name}
              </h3>
              {event.primary_shop && (
                <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: shopColor, fontFamily: 'var(--font-josefin)', flexShrink: 0 }}>
                  {event.primary_shop}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {event.location && (
                <span className="flex items-center gap-1.5" style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-urbanist)' }}>
                  <MapPin size={10} strokeWidth={1.5} />{event.location}
                </span>
              )}
              {event.event_start_date && (
                <span className="flex items-center gap-1.5" style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-urbanist)' }}>
                  <Calendar size={10} strokeWidth={1.5} />{formatDate(event.event_start_date)}
                </span>
              )}
              {event.load_by_date && (
                <span style={{ fontSize: '9px', fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                  Load {formatDate(event.load_by_date)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onArchive(); }}
              className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Archive size={12} strokeWidth={1.5} style={{ color: 'rgba(255,100,100,0.5)' }} />
            </button>
            <ChevronRight size={13} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.2)' }}
              className="transition-transform group-hover:translate-x-0.5 duration-150" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
