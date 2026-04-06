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

const PRESET_COLORS = [
  '#C4A35A', // gold
  '#4A82B8', // steel blue
  '#C4813A', // copper
  '#3D8B5C', // emerald
  '#8A5ABF', // amethyst
  '#C4603A', // rust
  '#3A8FC4', // ocean
  '#B06AC4', // rose
  '#5A7FD4', // indigo
  '#3DAAAA', // teal
  '#C44A5A', // crimson
  '#5AAA5A', // sage
];

export default function CreateCustomCardModal({
  isOpen,
  eventId,
  onClose,
  onCreated,
}: CreateCustomCardModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName('');
    setSelectedColor(PRESET_COLORS[0]);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Card name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('event_cards')
        .insert({
          event_id: eventId,
          is_custom: true,
          custom_name: name.trim(),
          custom_color: selectedColor,
          stage: null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const displayCard: DisplayCard = {
        displayId: data.id,
        eventCardId: data.id,
        type: 'Custom',
        letter: '',
        displayName: name.trim(),
        isCustom: true,
        customColor: selectedColor,
        stage: null,
        images: [],
      };

      onCreated(displayCard);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create card. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          >
            <motion.div
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{
                background: '#141418',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
              }}
              initial={{ y: '100%', opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
              </div>

              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <div className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Event Card
                  </div>
                  <h2 className="text-xl font-semibold" style={{ color: '#F0EFE8' }}>
                    Custom Card
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 space-y-5 pb-8">
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Uplighting Rig"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:opacity-30"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#F0EFE8',
                    }}
                    autoFocus
                    onFocus={e => { e.target.style.borderColor = `${selectedColor}55`; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className="aspect-square rounded-xl transition-transform"
                        style={{
                          background: color,
                          boxShadow: selectedColor === color
                            ? `0 0 0 2px #141418, 0 0 0 3.5px ${color}`
                            : `0 0 0 1px ${color}30`,
                          transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Preview */}
                  <div
                    className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: `${selectedColor}12`,
                      border: `1px solid ${selectedColor}30`,
                    }}
                  >
                    <div className="w-1 h-8 rounded-full" style={{ background: selectedColor }} />
                    <div>
                      <div className="text-xs" style={{ color: selectedColor }}>Custom</div>
                      <div className="text-base font-bold" style={{ color: '#F0EFE8' }}>
                        {name || 'Card Name'}
                      </div>
                    </div>
                  </div>
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
                      ? `${selectedColor}30`
                      : selectedColor,
                    color: isSubmitting ? `${selectedColor}80` : '#0A0A0C',
                    boxShadow: isSubmitting ? 'none' : `0 4px 20px ${selectedColor}40`,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    'Add Card'
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
