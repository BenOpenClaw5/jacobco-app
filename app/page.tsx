'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, MapPin, Calendar, Loader2, Zap } from 'lucide-react';
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
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const CONTAINER_VARIANTS = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

interface DeleteConfirmProps {
  event: Event;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirm({ event, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onCancel}
      />
      <motion.div
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={{
          background: '#161618',
          border: '1px solid rgba(239,68,68,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <h3 className="text-lg font-semibold mb-2" style={{ color: '#F0EFE8' }}>Delete Event?</h3>
        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          This will permanently delete
        </p>
        <p className="text-sm font-medium mb-4" style={{ color: '#F0EFE8' }}>
          &quot;{event.name}&quot;
        </p>
        <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          All cards, notes, and images for this event will be lost.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
            {isDeleting ? 'Deleting…' : 'Delete'}
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

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvents(data as Event[]);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEventCreated(event: Event) {
    setEvents(prev => [event, ...prev]);
  }

  async function handleDeleteConfirm() {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', deletingEvent.id);
      if (error) throw error;
      setEvents(prev => prev.filter(e => e.id !== deletingEvent.id));
      setDeletingEvent(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#08080A' }}>
      {/* Header */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(196,163,90,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative px-5 pt-12 pb-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Logo size="lg" asLink={false} />
          </motion.div>

          <motion.div
            className="mt-8 flex items-end justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: '#F0EFE8' }}>
                Events
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {events.length} {events.length === 1 ? 'event' : 'events'} in production
              </p>
            </div>

            <motion.button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #C4A35A, #D4B870)',
                color: '#0A0A0C',
                boxShadow: '0 4px 20px rgba(196,163,90,0.25)',
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 6px 28px rgba(196,163,90,0.35)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.12 }}
            >
              <Plus size={15} />
              New Event
            </motion.button>
          </motion.div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
        />
      </header>

      {/* Content */}
      <main className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin" style={{ color: 'rgba(196,163,90,0.5)' }} />
          </div>
        ) : events.length === 0 ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : (
          <motion.div
            className="space-y-3"
            variants={CONTAINER_VARIANTS}
            initial="hidden"
            animate="visible"
          >
            {events.map(event => (
              <EventListCard
                key={event.id}
                event={event}
                onDelete={() => setDeletingEvent(event)}
              />
            ))}
          </motion.div>
        )}
      </main>

      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleEventCreated}
      />

      <AnimatePresence>
        {deletingEvent && (
          <DeleteConfirm
            event={deletingEvent}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeletingEvent(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-24 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'rgba(196,163,90,0.06)',
          border: '1px solid rgba(196,163,90,0.12)',
        }}
      >
        <Zap size={32} style={{ color: 'rgba(196,163,90,0.5)' }} />
      </div>
      <h3 className="text-xl font-semibold mb-2" style={{ color: '#F0EFE8' }}>
        No events yet
      </h3>
      <p className="text-sm mb-8 max-w-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Create your first event to start tracking lighting cases across stages.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
        style={{
          background: 'linear-gradient(135deg, #C4A35A, #D4B870)',
          color: '#0A0A0C',
          boxShadow: '0 4px 20px rgba(196,163,90,0.25)',
        }}
      >
        <Plus size={15} />
        Create First Event
      </button>
    </motion.div>
  );
}

interface EventListCardProps {
  event: Event;
  onDelete: () => void;
}

function EventListCard({ event, onDelete }: EventListCardProps) {
  return (
    <motion.div
      variants={CARD_VARIANTS}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative group"
    >
      <Link href={`/events/${event.id}`} className="block">
        <motion.div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: '#111115',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
          }}
          whileHover={{
            borderColor: 'rgba(196,163,90,0.2)',
            boxShadow: '0 4px 28px rgba(0,0,0,0.4)',
          }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.15 }}
        >
          {/* Gold left accent */}
          <div
            className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
            style={{ background: 'linear-gradient(180deg, #C4A35A, rgba(196,163,90,0.3))' }}
          />

          <div className="pl-5 pr-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate" style={{ color: '#F0EFE8' }}>
                  {event.name}
                </h3>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <MapPin size={10} />
                      {event.location}
                    </span>
                  )}
                  {event.event_start_date && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Calendar size={10} />
                      {formatDate(event.event_start_date)}
                    </span>
                  )}
                  {event.load_by_date && (
                    <span className="text-xs" style={{ color: 'rgba(196,163,90,0.6)' }}>
                      Load by {formatDate(event.load_by_date)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)' }}
                >
                  <Trash2 size={13} style={{ color: 'rgba(239,68,68,0.6)' }} />
                </button>

                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>
              </div>
            </div>

            {event.notes && (
              <p
                className="text-xs mt-2.5 line-clamp-1"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                {event.notes}
              </p>
            )}
          </div>

          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, rgba(196,163,90,0.03) 0%, transparent 50%)',
            }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}
