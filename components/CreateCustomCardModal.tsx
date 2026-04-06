'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DisplayCard } from '@/lib/types';

interface CreateCustomCardModalProps {
  isOpen: boolean;
  eventId: string;
  onClose: () => void;
  onCreated: (card: DisplayCard) => void;
}

const COLORS = [
  '#7AAAD4', '#D4AA7A', '#7ABB94', '#AA8ED4',
  '#D48A7A', '#7AAEDD', '#B85B72', '#7AD4D4',
  '#D4C07A', '#7A94D4', '#AAAADD', '#7ADD7A',
];

export default function CreateCustomCardModal({ isOpen, eventId, onClose, onCreated }: CreateCustomCardModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reset() { setName(''); setColor(COLORS[0]); setError(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name required.'); return; }
    setIsSubmitting(true);
    try {
      const { data, error: dbError } = await supabase.from('event_cards').insert({
        event_id: eventId, is_custom: true,
        custom_name: name.trim(), custom_color: color, stage: null,
      }).select().single();
      if (dbError) throw dbError;
      onCreated({
        displayId: data.id, eventCardId: data.id,
        type: 'Custom', letter: '', displayName: name.trim(),
        isCustom: true, customColor: color, stage: null, images: [],
      });
      reset(); onClose();
    } catch (err) {
      console.error(err); setError('Failed to create card.');
    } finally { setIsSubmitting(false); }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(7,12,14,0.9)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              className="w-full sm:max-w-sm overflow-hidden"
              style={{ background: '#0c1317', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 280 }}
            >
              <div className="flex justify-center pt-4 pb-1 sm:hidden">
                <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>

              <div className="flex items-center justify-between px-7 py-6">
                <h2 className="text-xl font-light tracking-[0.08em]" style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
                  Custom Card
                </h2>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <X size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </button>
              </div>

              <div className="h-px mx-7" style={{ background: 'rgba(255,255,255,0.06)' }} />

              <form onSubmit={handleSubmit} className="px-7 pt-6 pb-8 space-y-6">
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Uplighting Rig"
                    autoFocus
                    className="w-full outline-none placeholder:opacity-20 text-sm"
                    style={{
                      background: 'transparent', border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff', borderRadius: 0,
                      fontFamily: 'var(--font-urbanist)', fontWeight: 200,
                      padding: '0 0 10px 0',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-4" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                    Color
                  </label>
                  <div className="grid grid-cols-6 gap-2 mb-5">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        className="aspect-square transition-transform"
                        style={{
                          background: c,
                          opacity: color === c ? 1 : 0.35,
                          outline: color === c ? `1px solid ${c}` : 'none',
                          outlineOffset: '2px',
                          transform: color === c ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Preview */}
                  <div className="flex items-center gap-3 py-3 px-4" style={{ border: `1px solid ${color}30`, background: `${color}10` }}>
                    <div className="w-px h-7" style={{ background: color }} />
                    <div>
                      <div className="text-[9px] tracking-[0.2em] uppercase font-light" style={{ color, fontFamily: 'var(--font-josefin)' }}>Custom</div>
                      <div className="text-base font-light tracking-wide" style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>{name || 'Card Name'}</div>
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs" style={{ color: '#ff6b6b' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-[10px] tracking-[0.3em] uppercase font-light flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    border: `1px solid rgba(255,255,255,0.4)`,
                    color: '#ffffff',
                    fontFamily: 'var(--font-josefin)',
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : null}
                  {isSubmitting ? 'Adding' : 'Add Card'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
