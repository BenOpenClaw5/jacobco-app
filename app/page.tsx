'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, MapPin, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import Logo from '@/components/Logo';
import CreateEventModal from '@/components/CreateEventModal';
import Link from 'next/link';

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const CONTAINER_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
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
        initial={{ scale: 0.97, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <h3 className="text-base font-light tracking-[0.08em] mb-2" style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
          Delete Event?
        </h3>
        <p className="text-xs font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          This will permanently delete
        </p>
        <p className="text-sm font-light mb-4" style={{ color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          &quot;{event.name}&quot;
        </p>
        <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light flex items-center justify-center gap-1.5 transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,80,80,0.3)', color: 'rgba(255,110,110,0.8)', fontFamily: 'var(--font-josefin)' }}
          >
            {isDeleting && <Loader2 size={10} className="animate-spin" />}
            {isDeleting ? 'Deleting' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setEvents(data as Event[]);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }

  async function handleDeleteConfirm() {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      await supabase.from('events').delete().eq('id', deletingEvent.id);
      setEvents(prev => prev.filter(e => e.id !== deletingEvent.id));
      setDeletingEvent(null);
    } catch (err) { console.error(err); }
    finally { setIsDeleting(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Logo size="sm" asLink={false} />
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
          style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
        >
          <Plus size={11} strokeWidth={1.5} />
          New Event
        </button>
      </nav>

      {/* Hero title */}
      <div className="px-6 pt-14 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-[9px] tracking-[0.4em] uppercase font-light mb-4" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
            Production Board
          </div>
          <h1
            className="text-3xl font-light tracking-[0.06em] leading-tight"
            style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
          >
            Events
          </h1>
          {!isLoading && (
            <p className="text-xs font-light mt-2" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, letterSpacing: '0.03em' }}>
              {events.length} {events.length === 1 ? 'event' : 'events'} in production
            </p>
          )}
        </motion.div>
      </div>

      <div className="h-px mx-6" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* List */}
      <main className="px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-28">
            <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : events.length === 0 ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : (
          <motion.div
            className="space-y-px"
            variants={CONTAINER_VARIANTS}
            initial="hidden"
            animate="visible"
          >
            {events.map(event => (
              <EventListCard key={event.id} event={event} onDelete={() => setDeletingEvent(event)} />
            ))}
          </motion.div>
        )}
      </main>

      <CreateEventModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={e => setEvents(p => [e, ...p])} />

      <AnimatePresence>
        {deletingEvent && (
          <DeleteConfirm event={deletingEvent} onConfirm={handleDeleteConfirm} onCancel={() => setDeletingEvent(null)} isDeleting={isDeleting} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-28 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="w-12 h-px mb-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
      <h3
        className="text-lg font-light tracking-[0.1em] mb-2"
        style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
      >
        No Events Yet
      </h3>
      <p className="text-xs font-light mb-10 max-w-xs" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, lineHeight: 1.8 }}>
        Create your first event to begin tracking lighting cases across production stages.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2.5 px-7 py-3 text-[10px] tracking-[0.3em] uppercase font-light transition-opacity hover:opacity-60"
        style={{ border: '1px solid rgba(255,255,255,0.4)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
      >
        <Plus size={11} strokeWidth={1.5} />
        Create Event
      </button>
    </motion.div>
  );
}

function EventListCard({ event, onDelete }: { event: Event; onDelete: () => void }) {
  return (
    <motion.div
      variants={CARD_VARIANTS}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <Link href={`/events/${event.id}`} className="block">
        <motion.div
          className="flex items-center justify-between py-5 px-0 relative"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
        >
          {/* Left accent — only visible on hover */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-px transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{ background: 'rgba(255,255,255,0.5)', height: '40%' }}
          />

          <div className="pl-3 min-w-0 flex-1">
            <h3
              className="font-light tracking-[0.05em] truncate"
              style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)', fontSize: '15px' }}
            >
              {event.name}
            </h3>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              {event.location && (
                <span className="flex items-center gap-1.5 text-xs font-light" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                  <MapPin size={10} strokeWidth={1.5} />
                  {event.location}
                </span>
              )}
              {event.event_start_date && (
                <span className="flex items-center gap-1.5 text-xs font-light" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
                  <Calendar size={10} strokeWidth={1.5} />
                  {formatDate(event.event_start_date)}
                </span>
              )}
              {event.load_by_date && (
                <span className="text-[10px] font-light tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-josefin)' }}>
                  Load {formatDate(event.load_by_date)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={12} strokeWidth={1.5} style={{ color: 'rgba(255,100,100,0.5)' }} />
            </button>
            <ChevronRight size={13} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.2)' }} className="transition-transform group-hover:translate-x-0.5 duration-150" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
