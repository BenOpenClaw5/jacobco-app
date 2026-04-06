'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: Event) => void;
}

const OVERLAY_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const MODAL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export default function CreateEventModal({ isOpen, onClose, onCreated }: CreateEventModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loadByDate, setLoadByDate] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName('');
    setLocation('');
    setLoadByDate('');
    setEventStartDate('');
    setEventEndDate('');
    setNotes('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const insertData: Record<string, string | null> = {
        name: name.trim(),
        location: location.trim() || null,
        load_by_date: loadByDate || null,
        event_start_date: eventStartDate || null,
        event_end_date: eventEndDate || null,
        notes: notes.trim() || null,
      };

      const { data, error: dbError } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();

      if (dbError) throw dbError;

      onCreated(data as Event);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = `w-full rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:opacity-30`;
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F0EFE8',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            variants={OVERLAY_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{
                background: '#141418',
                border: '1px solid rgba(196,163,90,0.15)',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,163,90,0.05)',
              }}
              variants={MODAL_VARIANTS}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <div className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: '#C4A35A' }}>
                    Jacob Co
                  </div>
                  <h2 className="text-xl font-semibold" style={{ color: '#F0EFE8' }}>
                    New Event
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <div
                className="mx-6 h-px mb-5"
                style={{ background: 'linear-gradient(90deg, rgba(196,163,90,0.3), transparent)' }}
              />

              <form onSubmit={handleSubmit} className="px-6 space-y-4 pb-8">
                {/* Event name */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Event Name *
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. The Martinez Wedding"
                    className={inputClass}
                    style={inputStyle}
                    autoFocus
                    onFocus={e => { e.target.style.borderColor = 'rgba(196,163,90,0.4)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Location
                  </label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Venue name or address"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'rgba(196,163,90,0.4)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Event Start
                    </label>
                    <input
                      type="date"
                      value={eventStartDate}
                      onChange={e => setEventStartDate(e.target.value)}
                      className={inputClass}
                      style={{ ...inputStyle, colorScheme: 'dark' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(196,163,90,0.4)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Event End
                    </label>
                    <input
                      type="date"
                      value={eventEndDate}
                      onChange={e => setEventEndDate(e.target.value)}
                      className={inputClass}
                      style={{ ...inputStyle, colorScheme: 'dark' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(196,163,90,0.4)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                </div>

                {/* Load by date */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <CalendarDays size={10} className="inline mr-1.5" />
                    Needs to be Loaded by
                  </label>
                  <input
                    type="date"
                    value={loadByDate}
                    onChange={e => setLoadByDate(e.target.value)}
                    className={inputClass}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(196,163,90,0.4)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any notes for this event..."
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'rgba(196,163,90,0.4)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                {error && (
                  <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2"
                  style={{
                    background: isSubmitting
                      ? 'rgba(196,163,90,0.2)'
                      : 'linear-gradient(135deg, #C4A35A, #D4B870)',
                    color: isSubmitting ? 'rgba(196,163,90,0.5)' : '#0A0A0C',
                    boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(196,163,90,0.25)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    'Create Event'
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
