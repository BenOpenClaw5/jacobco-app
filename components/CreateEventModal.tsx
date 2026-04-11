'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Event, Shop, SHOPS } from '@/lib/types';
import TeamSelect from './TeamSelect';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: Event) => void;
}

export default function CreateEventModal({ isOpen, onClose, onCreated }: CreateEventModalProps) {
  const [name, setName] = useState('');
  const [shop, setShop] = useState<Shop>('Orlando');
  const [location, setLocation] = useState('');
  const [loadByDate, setLoadByDate] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [dropoffTime, setDropoffTime] = useState('');
  const [dropoffDriver, setDropoffDriver] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [pickupDriver, setPickupDriver] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName(''); setShop('Orlando'); setLocation(''); setLoadByDate('');
    setEventStartDate(''); setEventEndDate(''); setNotes(''); setTeamMembers([]);
    setDropoffTime(''); setDropoffDriver(''); setPickupTime(''); setPickupDriver('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Event name is required.'); return; }
    setIsSubmitting(true); setError('');
    try {
      const { data, error: dbError } = await supabase.from('events').insert({
        name: name.trim(),
        primary_shop: shop,
        location: location.trim() || null,
        load_by_date: loadByDate || null,
        event_start_date: eventStartDate || null,
        event_end_date: eventEndDate || null,
        notes: notes.trim() || null,
        team_members: teamMembers,
        dropoff_time: dropoffTime || null,
        dropoff_driver: dropoffDriver.trim() || null,
        pickup_time: pickupTime || null,
        pickup_driver: pickupDriver.trim() || null,
        last_updated_by: 'Guest User',
        last_updated_at: new Date().toISOString(),
      }).select().single();
      if (dbError) throw dbError;
      onCreated(data as Event);
      reset(); onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create event.');
    } finally { setIsSubmitting(false); }
  }

  const fieldStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: 0,
    fontFamily: 'var(--font-urbanist)',
    fontWeight: 200,
    fontSize: '14px',
    letterSpacing: '0.01em',
    padding: '0 0 10px 0',
    width: '100%',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(7,12,14,0.9)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              className="w-full sm:max-w-md overflow-y-auto max-h-[92vh]"
              style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 280 }}
            >
              {/* Drag line */}
              <div className="flex justify-center pt-4 pb-1 sm:hidden">
                <div className="w-8 h-px" style={{ background: 'var(--border-strong)' }} />
              </div>

              <div className="flex items-center justify-between px-7 py-6">
                <div>
                  <div className="text-[9px] tracking-[0.3em] uppercase font-light mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Jacob Co
                  </div>
                  <h2 className="text-xl font-light tracking-[0.08em]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-josefin)' }}>
                    New Event
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center" style={{ border: '1px solid var(--border)' }}>
                  <X size={13} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              <div className="h-px mx-7" style={{ background: 'var(--border)' }} />

              <form onSubmit={handleSubmit} className="px-7 pt-6 pb-8 space-y-5">
                {[
                  { label: 'Event Name', value: name, set: setName, placeholder: 'The Martinez Wedding', required: true },
                  { label: 'Location', value: location, set: setLocation, placeholder: 'Venue or address' },
                ].map(({ label, value, set, placeholder, required }) => (
                  <div key={label}>
                    <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                      {label}{required && ' *'}
                    </label>
                    <input
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      style={fieldStyle}
                      className="outline-none placeholder:opacity-20"
                      autoFocus={required}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Shop
                  </label>
                  <div className="flex gap-2">
                    {SHOPS.map(s => (
                      <button key={s} type="button" onClick={() => setShop(s)}
                        className="flex-1 py-2 text-[9px] tracking-[0.2em] uppercase font-light transition-all"
                        style={{
                          fontFamily: 'var(--font-josefin)',
                          border: shop === s ? '1px solid var(--border-strong)' : '1px solid var(--border)',
                          color: shop === s ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {[
                    { label: 'Event Start', value: eventStartDate, set: setEventStartDate },
                    { label: 'Event End', value: eventEndDate, set: setEventEndDate },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                        {label}
                      </label>
                      <input type="date" value={value} onChange={e => set(e.target.value)} style={{ ...fieldStyle, colorScheme: 'light dark' }} className="outline-none" />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Load by Date
                  </label>
                  <input type="date" value={loadByDate} onChange={e => setLoadByDate(e.target.value)} style={{ ...fieldStyle, colorScheme: 'light dark' }} className="outline-none" />
                </div>

                {/* Transport — Drop-off */}
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Drop-off
                  </label>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className="text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>Time</div>
                      <input type="datetime-local" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)}
                        style={{ ...fieldStyle, colorScheme: 'light dark' }} className="outline-none" />
                    </div>
                    <div>
                      <div className="text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>Driver</div>
                      <input value={dropoffDriver} onChange={e => setDropoffDriver(e.target.value)}
                        placeholder="Driver name" style={fieldStyle} className="outline-none placeholder:opacity-20" />
                    </div>
                  </div>
                </div>

                {/* Transport — Pick-up */}
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Pick-up
                  </label>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className="text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>Time</div>
                      <input type="datetime-local" value={pickupTime} onChange={e => setPickupTime(e.target.value)}
                        style={{ ...fieldStyle, colorScheme: 'light dark' }} className="outline-none" />
                    </div>
                    <div>
                      <div className="text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>Driver</div>
                      <input value={pickupDriver} onChange={e => setPickupDriver(e.target.value)}
                        placeholder="Driver name" style={fieldStyle} className="outline-none placeholder:opacity-20" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Notes
                  </label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any notes..."
                    className="w-full resize-none outline-none placeholder:opacity-20 text-sm"
                    style={{ ...fieldStyle, borderBottom: '1px solid var(--border)' }} />
                </div>

                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Team
                  </label>
                  <TeamSelect selected={teamMembers} onChange={setTeamMembers} openUp />
                </div>

                {error && <p className="text-xs" style={{ color: '#ff6b6b' }}>{error}</p>}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 text-[10px] tracking-[0.3em] uppercase font-light flex items-center justify-center gap-2 transition-opacity"
                    style={{
                      border: '1px solid var(--border-strong)',
                      color: isSubmitting ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-josefin)',
                      opacity: isSubmitting ? 0.5 : 1,
                    }}
                  >
                    {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : null}
                    {isSubmitting ? 'Creating' : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
