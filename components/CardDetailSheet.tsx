'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImagePlus, Trash2, ChevronRight, Loader2 } from 'lucide-react';
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

const OVERLAY_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const SHEET_VARIANTS = {
  hidden: { y: '100%' },
  visible: { y: '0%' },
};

export default function CardDetailSheet({
  card,
  eventId,
  isOpen,
  onClose,
  onCardUpdated,
  onCardMoved,
}: CardDetailSheetProps) {
  const [notes, setNotes] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [preppedBy, setPreppedBy] = useState('');
  const [images, setImages] = useState<{ id: string; url: string; storage_path: string; event_card_id?: string; created_at?: string }[]>([]);
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

  // Ensure event_cards record exists, return its id
  async function ensureEventCard(): Promise<string> {
    if (card!.eventCardId) return card!.eventCardId;

    const insertData: Record<string, unknown> = {
      event_id: eventId,
      is_custom: card!.isCustom,
    };
    if (!card!.isCustom) {
      insertData.inventory_case_id = card!.inventoryCaseId;
    } else {
      insertData.custom_name = card!.displayName;
      insertData.custom_color = card!.customColor;
    }

    const { data, error } = await supabase
      .from('event_cards')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async function saveDetails() {
    if (!card) return;
    setIsSaving(true);
    try {
      const ecId = await ensureEventCard();
      const { error } = await supabase
        .from('event_cards')
        .update({ notes, approved_by: approvedBy, prepped_by: preppedBy })
        .eq('id', ecId);
      if (error) throw error;
      onCardUpdated({ eventCardId: ecId, notes, approved_by: approvedBy, prepped_by: preppedBy });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }

  function scheduleAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    const t = setTimeout(() => saveDetails(), 1200);
    setSaveTimeout(t);
  }

  async function handleMove(newStage: Stage | null) {
    if (!card || isMoving) return;
    setIsMoving(true);
    try {
      const ecId = await ensureEventCard();
      // First save any pending details
      await supabase.from('event_cards').update({
        stage: newStage ?? null,
        notes,
        approved_by: approvedBy,
        prepped_by: preppedBy,
      }).eq('id', ecId);
      onCardMoved({ ...card, eventCardId: ecId }, newStage);
      onClose();
    } catch (err) {
      console.error('Move failed:', err);
    } finally {
      setIsMoving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const ecId = await ensureEventCard();
      const uploadedImages: typeof images = [];

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `events/${eventId}/${ecId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('card-images')
          .upload(path, file, { upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage.from('card-images').getPublicUrl(path);

        const { data: imgData, error: insertError } = await supabase
          .from('event_card_images')
          .insert({ event_card_id: ecId, url: urlData.publicUrl, storage_path: path })
          .select()
          .single();

        if (insertError) {
          console.error('Insert image error:', insertError);
          continue;
        }

        uploadedImages.push({ id: imgData.id, url: imgData.url, storage_path: imgData.storage_path });
      }

      const newImages = [...images, ...uploadedImages];
      setImages(newImages);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onCardUpdated({ eventCardId: ecId, images: newImages as any });
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveImage(imageId: string, storagePath: string) {
    try {
      await supabase.storage.from('card-images').remove([storagePath]);
      await supabase.from('event_card_images').delete().eq('id', imageId);
      const newImages = images.filter(img => img.id !== imageId);
      setImages(newImages);
      if (card!.eventCardId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCardUpdated({ eventCardId: card!.eventCardId, images: newImages as any });
      }
    } catch (err) {
      console.error('Remove image failed:', err);
    }
  }

  const moveTargets: { label: string; stage: Stage | null; color: string; dot: string }[] = [
    ...STAGES.filter(s => s !== card.stage).map(s => ({
      label: STAGE_META[s].label,
      stage: s as Stage,
      color: STAGE_COLORS[s].accent,
      dot: STAGE_COLORS[s].dot,
    })),
    ...(card.stage !== null && card.stage !== undefined
      ? [{ label: 'Inventory Pool', stage: null as null, color: 'rgba(255,255,255,0.4)', dot: 'rgba(255,255,255,0.3)' }]
      : []),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            variants={OVERLAY_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: '#141418',
              border: `1px solid ${color.border}`,
              borderBottom: 'none',
              maxHeight: '92vh',
              boxShadow: `0 -20px 60px rgba(0,0,0,0.6), 0 -4px 20px ${color.glow}`,
            }}
            variants={SHEET_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 20px)' }}>
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-3 pb-5">
                <div>
                  <div
                    className="text-xs font-medium tracking-widest uppercase mb-1"
                    style={{ color: color.text }}
                  >
                    {card.type}
                  </div>
                  <div className="text-3xl font-bold" style={{ color: '#F0EFE8' }}>
                    {card.isCustom ? card.displayName : card.letter}
                  </div>
                  {card.stage && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: STAGE_COLORS[card.stage].dot }}
                      />
                      <span className="text-xs" style={{ color: STAGE_COLORS[card.stage].accent }}>
                        {STAGE_COLORS[card.stage].label}
                      </span>
                    </div>
                  )}
                  {!card.stage && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Inventory Pool
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center mt-1 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              {/* Left accent line */}
              <div
                className="mx-6 h-px mb-5"
                style={{ background: `linear-gradient(90deg, ${color.accent}40, transparent)` }}
              />

              {/* Details section */}
              <div className="px-6 space-y-5">
                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => { setNotes(e.target.value); scheduleAutoSave(); }}
                    rows={3}
                    placeholder="Event-specific notes..."
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all placeholder:opacity-30"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#F0EFE8',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = color.accent + '55';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                      saveDetails();
                    }}
                  />
                </div>

                {/* Approved by / Prepped by */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Approved by
                    </label>
                    <input
                      value={approvedBy}
                      onChange={e => { setApprovedBy(e.target.value); scheduleAutoSave(); }}
                      placeholder="Name"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:opacity-30"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#F0EFE8',
                      }}
                      onFocus={e => { e.target.style.borderColor = color.accent + '55'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; saveDetails(); }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Prepped by
                    </label>
                    <input
                      value={preppedBy}
                      onChange={e => { setPreppedBy(e.target.value); scheduleAutoSave(); }}
                      placeholder="Name"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:opacity-30"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#F0EFE8',
                      }}
                      onFocus={e => { e.target.style.borderColor = color.accent + '55'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; saveDetails(); }}
                    />
                  </div>
                </div>

                {/* Auto-save indicator */}
                {isSaving && (
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={10} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Saving…</span>
                  </div>
                )}

                {/* Images */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Photos
                  </label>

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {images.map(img => (
                        <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handleRemoveImage(img.id, img.storage_path)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.75)' }}
                          >
                            <Trash2 size={10} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2.5 w-full rounded-xl px-4 py-3 text-sm transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px dashed rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {isUploading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ImagePlus size={15} />
                    )}
                    <span>{isUploading ? 'Uploading…' : 'Add photos'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {/* Move To */}
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Move to
                  </label>
                  <div className="space-y-2">
                    {moveTargets.map(target => (
                      <button
                        key={target.label}
                        onClick={() => handleMove(target.stage)}
                        disabled={isMoving}
                        className="flex items-center justify-between w-full rounded-xl px-4 py-3.5 text-sm transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid rgba(255,255,255,0.07)`,
                          color: target.color,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: target.dot }}
                          />
                          <span>{target.label}</span>
                        </div>
                        {isMoving ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        ) : (
                          <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom padding for safe area */}
              <div className="h-10" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
