'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { DisplayCard, Stage, STAGES, STAGE_META } from '@/lib/types';
import { getCaseColor, STAGE_COLORS } from '@/lib/caseColors';
import { supabase } from '@/lib/supabase';

interface CardDetailSheetProps {
  card: DisplayCard | null;
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onCardUpdated: (updates: Partial<DisplayCard> & { eventCardId: string }) => void;
  onCardMoved: (card: DisplayCard, newStage: Stage | null) => void;
}

export default function CardDetailSheet({
  card, eventId, isOpen, onClose, onCardUpdated, onCardMoved,
}: CardDetailSheetProps) {
  const [notes, setNotes] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [preppedBy, setPreppedBy] = useState('');
  const [images, setImages] = useState<{ id: string; url: string; storage_path: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (card) {
      setNotes(card.notes ?? '');
      setApprovedBy(card.approved_by ?? '');
      setPreppedBy(card.prepped_by ?? '');
      setImages(card.images ?? []);
    }
  }, [card]);

  if (!card) return null;
  const color = getCaseColor(card.type, card.customColor);

  async function ensureEventCard(): Promise<string> {
    if (card!.eventCardId) return card!.eventCardId;
    const insertData: Record<string, unknown> = { event_id: eventId, is_custom: card!.isCustom };
    if (!card!.isCustom) insertData.inventory_case_id = card!.inventoryCaseId;
    else { insertData.custom_name = card!.displayName; insertData.custom_color = card!.customColor; }
    const { data, error } = await supabase.from('event_cards').insert(insertData).select('id').single();
    if (error) throw error;
    return data.id;
  }

  async function saveDetails() {
    if (!card) return;
    setIsSaving(true);
    try {
      const ecId = await ensureEventCard();
      await supabase.from('event_cards').update({ notes, approved_by: approvedBy, prepped_by: preppedBy }).eq('id', ecId);
      onCardUpdated({ eventCardId: ecId, notes, approved_by: approvedBy, prepped_by: preppedBy });
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  }

  function scheduleAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(setTimeout(() => saveDetails(), 1200));
  }

  async function handleMove(newStage: Stage | null) {
    if (!card || isMoving) return;
    setIsMoving(true);
    try {
      const ecId = await ensureEventCard();
      await supabase.from('event_cards').update({ stage: newStage ?? null, notes, approved_by: approvedBy, prepped_by: preppedBy }).eq('id', ecId);
      onCardMoved({ ...card, eventCardId: ecId }, newStage);
      onClose();
    } catch (err) { console.error(err); }
    finally { setIsMoving(false); }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const ecId = await ensureEventCard();
      const uploaded: typeof images = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `events/${eventId}/${ecId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('card-images').upload(path, file);
        if (upErr) { console.error(upErr); continue; }
        const { data: urlData } = supabase.storage.from('card-images').getPublicUrl(path);
        const { data: imgData, error: insErr } = await supabase.from('event_card_images').insert({ event_card_id: ecId, url: urlData.publicUrl, storage_path: path }).select().single();
        if (insErr) { console.error(insErr); continue; }
        uploaded.push({ id: imgData.id, url: imgData.url, storage_path: imgData.storage_path });
      }
      const newImages = [...images, ...uploaded];
      setImages(newImages);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCardUpdated({ eventCardId: ecId, images: newImages as any });
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  async function handleRemoveImage(imageId: string, storagePath: string) {
    try {
      await supabase.storage.from('card-images').remove([storagePath]);
      await supabase.from('event_card_images').delete().eq('id', imageId);
      const newImages = images.filter(img => img.id !== imageId);
      setImages(newImages);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (card!.eventCardId) onCardUpdated({ eventCardId: card!.eventCardId, images: newImages as any });
    } catch (err) { console.error(err); }
  }

  const moveTargets: { label: string; stage: Stage | null; accent: string }[] = [
    ...STAGES.filter(s => s !== card.stage).map(s => ({
      label: STAGE_META[s].label,
      stage: s as Stage,
      accent: STAGE_COLORS[s].accent,
    })),
    ...(card.stage ? [{ label: 'Inventory Pool', stage: null as null, accent: 'rgba(255,255,255,0.35)' }] : []),
  ];

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff',
    borderRadius: 0,
    fontFamily: 'var(--font-urbanist)',
    fontWeight: 200,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(7,12,14,0.85)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-none overflow-hidden"
            style={{
              background: '#0c1317',
              borderTop: `1px solid rgba(255,255,255,0.08)`,
              maxHeight: '92vh',
              boxShadow: '0 -40px 80px rgba(0,0,0,0.7)',
            }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
          >
            {/* Drag indicator */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-8 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 24px)' }}>
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-4 pb-6">
                <div>
                  <div
                    className="text-[9px] font-light tracking-[0.3em] uppercase mb-2"
                    style={{ color: color.text, fontFamily: 'var(--font-josefin)' }}
                  >
                    {card.isCustom ? 'Custom' : card.type}
                  </div>
                  <div
                    className="text-4xl font-light tracking-wide"
                    style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}
                  >
                    {card.isCustom ? card.displayName : card.letter}
                  </div>
                  {!card.isCustom && (
                    <div
                      className="text-sm font-light mt-1"
                      style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}
                    >
                      {card.displayName}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-3 h-px" style={{ background: card.stage ? STAGE_COLORS[card.stage].accent : 'rgba(255,255,255,0.2)' }} />
                    <span
                      className="text-[10px] tracking-[0.2em] uppercase font-light"
                      style={{
                        color: card.stage ? STAGE_COLORS[card.stage].accent : 'rgba(255,255,255,0.25)',
                        fontFamily: 'var(--font-josefin)',
                      }}
                    >
                      {card.stage ? STAGE_COLORS[card.stage].label : 'Inventory Pool'}
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  <X size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </button>
              </div>

              <div className="h-px mx-6" style={{ background: 'rgba(255,255,255,0.06)' }} />

              <div className="px-6 pt-6 space-y-6 pb-10">
                {/* Notes */}
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => { setNotes(e.target.value); scheduleAutoSave(); }}
                    rows={3}
                    placeholder="Event-specific notes"
                    className="w-full text-sm resize-none outline-none placeholder:opacity-20"
                    style={{ ...inputStyle, padding: '0 0 8px 0', fontSize: '13px', letterSpacing: '0.01em' }}
                    onBlur={() => saveDetails()}
                  />
                </div>

                {/* Approved / Prepped */}
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { label: 'Approved by', value: approvedBy, set: setApprovedBy },
                    { label: 'Prepped by', value: preppedBy, set: setPreppedBy },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                        {label}
                      </label>
                      <input
                        value={value}
                        onChange={e => { set(e.target.value); scheduleAutoSave(); }}
                        onBlur={() => saveDetails()}
                        placeholder="Name"
                        className="w-full text-sm outline-none placeholder:opacity-20"
                        style={{ ...inputStyle, padding: '0 0 8px 0', fontSize: '13px' }}
                      />
                    </div>
                  ))}
                </div>

                {isSaving && (
                  <div className="flex items-center gap-2">
                    <Loader2 size={9} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    <span className="text-[9px] tracking-widest uppercase font-light" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>Saving</span>
                  </div>
                )}

                {/* Images */}
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                    Photos
                  </label>

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {images.map(img => (
                        <div key={img.id} className="relative group aspect-square overflow-hidden" style={{ background: '#080d10' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                          <button
                            onClick={() => handleRemoveImage(img.id, img.storage_path)}
                            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}
                          >
                            <Trash2 size={9} style={{ color: '#ff6b6b' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 py-2.5 text-xs font-light transition-opacity hover:opacity-60"
                    style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', fontFamily: 'var(--font-josefin)', letterSpacing: '0.15em', fontSize: '10px', textTransform: 'uppercase' }}
                  >
                    {isUploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    {isUploading ? 'Uploading' : 'Add Photos'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </div>

                {/* Move to */}
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-4" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                    Move to
                  </label>
                  <div className="space-y-1">
                    {moveTargets.map(target => (
                      <button
                        key={target.label}
                        onClick={() => handleMove(target.stage)}
                        disabled={isMoving}
                        className="flex items-center justify-between w-full py-3 px-0 text-left transition-opacity hover:opacity-60"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-px" style={{ background: target.accent }} />
                          <span
                            className="text-[10px] tracking-[0.2em] uppercase font-light"
                            style={{ color: target.accent, fontFamily: 'var(--font-josefin)' }}
                          >
                            {target.label}
                          </span>
                        </div>
                        {isMoving
                          ? <Loader2 size={11} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
                          : <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.15)' }} />
                        }
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
