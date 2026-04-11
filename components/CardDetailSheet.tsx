'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// framer-motion removed — iOS Safari crashes from JS-animated springs on mount
import { X, Plus, Trash2, ChevronRight, Loader2, ZoomIn, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { DisplayCard, Stage, STAGES, STAGE_META } from '@/lib/types';
import { getCaseColor, STAGE_COLORS } from '@/lib/caseColors';
import { supabase } from '@/lib/supabase';
import { TOOLS_CHECKLIST, ALL_CHECKLIST_ITEMS, TOTAL_ITEMS } from '@/lib/toolsChecklist';

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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // Tools checklist
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [checklistPacked, setChecklistPacked] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSavingChecklist, _setIsSavingChecklist] = useState(false);
  const [isPackingAll, setIsPackingAll] = useState(false);
  // Warning when moving tools card with incomplete checklist
  const [pendingMove, setPendingMove] = useState<Stage | null | undefined>(undefined);
  // Serial numbers (Pixel Brick and AX5 only)
  const [serialNumbers, setSerialNumbers] = useState<{ label: string; serial: string }[]>([]);
  // Dual beam cover color
  const [dualBeamCoverColor, setDualBeamCoverColor] = useState('');
  const checklistSaveRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (card) {
      setNotes(card.notes ?? '');
      setApprovedBy(card.approved_by ?? '');
      setPreppedBy(card.prepped_by ?? '');
      setImages(card.images ?? []);
      setChecklistState(card.checklist_state ?? {});
      setChecklistPacked(card.checklist_packed ?? false);
      setPendingMove(undefined);
      // Load dual beam cover color from card's dual_beam_cover_color field if present
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDualBeamCoverColor((card as any).dual_beam_cover_color ?? '');
    }
  }, [card]);

  // Load serial numbers for Pixel Brick and AX5 cases
  useEffect(() => {
    if (!card || card.isCustom || !card.inventoryCaseId || (card.type !== 'Pixel Brick' && card.type !== 'AX5')) {
      setSerialNumbers([]);
      return;
    }
    const caseId = card.inventoryCaseId;
    async function loadSerials() {
      try {
        const { data } = await supabase.from('inventory_cases').select('serial_numbers').eq('id', caseId).single();
        const sn = (data?.serial_numbers as { label: string; serial: string }[] | null) ?? [];
        setSerialNumbers(sn.length > 0 ? sn : [{ label: '', serial: '' }]);
      } catch {
        setSerialNumbers([{ label: '', serial: '' }]);
      }
    }
    loadSerials();
  }, [card]);

  // ALL hooks must be called before any early return (Rules of Hooks)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveChecklistState = useCallback(async (state: Record<string, boolean>) => {
    if (!card) return;
    try {
      const ecId = await ensureEventCard();
      await supabase.from('event_cards').update({ checklist_state: state }).eq('id', ecId);
    } catch (err) { console.error(err); }
  }, [card]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function saveSerialNumbers(sn: { label: string; serial: string }[]) {
    if (!card?.inventoryCaseId) return;
    try {
      await supabase.from('inventory_cases').update({ serial_numbers: sn }).eq('id', card.inventoryCaseId);
    } catch (err) { console.error(err); }
  }

  async function saveDetails() {
    if (!card) return;
    setIsSaving(true);
    try {
      const ecId = await ensureEventCard();
      await supabase.from('event_cards').update({ notes, approved_by: approvedBy, prepped_by: preppedBy }).eq('id', ecId);
      onCardUpdated({ eventCardId: ecId, displayId: card!.displayId, notes, approved_by: approvedBy, prepped_by: preppedBy });
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  }

  async function saveDualBeamColor(color: string) {
    if (!card || card.type !== 'Dual Beam') return;
    try {
      const ecId = await ensureEventCard();
      await supabase.from('event_cards').update({ dual_beam_cover_color: color || null }).eq('id', ecId);
    } catch (err) { console.error(err); }
  }

  function scheduleAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(setTimeout(() => saveDetails(), 1200));
  }

  async function handleMove(newStage: Stage | null) {
    if (!card || isMoving) return;
    // Tools card: warn if moving to prepped/loaded without completing checklist
    if (
      card.type === 'Tools' &&
      (newStage === 'prepped' || newStage === 'loaded') &&
      !checklistPacked
    ) {
      setPendingMove(newStage);
      return;
    }
    await executeMove(newStage, false);
  }

  async function executeMove(newStage: Stage | null, withWarning: boolean) {
    if (!card || isMoving) return;
    setIsMoving(true);
    setPendingMove(undefined);
    try {
      const ecId = await ensureEventCard();
      const updates: Record<string, unknown> = {
        stage: newStage ?? null,
        notes,
        approved_by: approvedBy,
        prepped_by: preppedBy,
      };
      if (withWarning) updates.has_tools_warning = true;
      await supabase.from('event_cards').update(updates).eq('id', ecId);
      onCardMoved({ ...card, eventCardId: ecId, has_tools_warning: withWarning || card.has_tools_warning }, newStage);
      onClose();
    } catch (err) { console.error(err); }
    finally { setIsMoving(false); }
  }

  function toggleChecklistItem(itemId: string) {
    const next = { ...checklistState, [itemId]: !checklistState[itemId] };
    setChecklistState(next);
    // Debounce save
    if (checklistSaveRef.current) clearTimeout(checklistSaveRef.current);
    checklistSaveRef.current = setTimeout(() => saveChecklistState(next), 800);
  }

  async function handlePackAll() {
    const allChecked = ALL_CHECKLIST_ITEMS.every(item => checklistState[item.id]);
    if (!allChecked) return;
    setIsPackingAll(true);
    try {
      const ecId = await ensureEventCard();
      await supabase.from('event_cards').update({ checklist_packed: true, has_tools_warning: false }).eq('id', ecId);
      setChecklistPacked(true);
      onCardUpdated({ eventCardId: ecId, displayId: card!.displayId, checklist_packed: true, has_tools_warning: false });
    } catch (err) { console.error(err); }
    finally { setIsPackingAll(false); }
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
      onCardUpdated({ eventCardId: ecId, displayId: card!.displayId, images: newImages as any });
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
      if (card!.eventCardId) onCardUpdated({ eventCardId: card!.eventCardId, displayId: card!.displayId, images: newImages as any });
    } catch (err) { console.error(err); }
  }

  const moveTargets: { label: string; stage: Stage | null; accent: string }[] = [
    ...STAGES.filter(s => s !== card.stage).map(s => ({
      label: STAGE_META[s].label,
      stage: s as Stage,
      accent: STAGE_COLORS[s].accent,
    })),
    ...(card.stage ? [{ label: 'Inventory Pool', stage: null as null, accent: 'var(--text-muted)' }] : []),
  ];

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: 0,
    fontFamily: 'var(--font-urbanist)',
    fontWeight: 200,
  };

  return (
    <>
      {/* Backdrop — CSS transition, no framer-motion */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(7,12,14,0.85)', backdropFilter: 'blur(6px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      {/* Sheet — CSS transform transition */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          overflow: 'hidden',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          maxHeight: '92vh',
          boxShadow: '0 -40px 80px rgba(0,0,0,0.7)',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
            {/* Drag indicator */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-8 h-px" style={{ background: 'var(--border-strong)' }} />
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
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-josefin)' }}
                  >
                    {card.isCustom ? card.displayName : card.letter}
                  </div>
                  {!card.isCustom && (
                    <div
                      className="text-sm font-light mt-1"
                      style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}
                    >
                      {card.displayName}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="w-3 h-px" style={{ background: card.stage ? STAGE_COLORS[card.stage].accent : 'var(--text-dim)' }} />
                    <span
                      className="text-[10px] tracking-[0.2em] uppercase font-light"
                      style={{
                        color: card.stage ? STAGE_COLORS[card.stage].accent : 'var(--text-muted)',
                        fontFamily: 'var(--font-josefin)',
                      }}
                    >
                      {card.stage ? STAGE_COLORS[card.stage].label : 'Inventory Pool'}
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center" style={{ border: '1px solid var(--border)' }}>
                  <X size={13} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* ── MOVE TO — top of content, full-width prominent ── */}
              <div className="px-6 pt-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                  Move to
                </label>

                {/* Tools warning inline */}
                {pendingMove !== undefined && (
                  <div style={{ background: 'rgba(220,140,30,0.08)', border: '1px solid rgba(220,140,30,0.2)', padding: '14px', marginBottom: '10px' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={12} style={{ color: 'rgba(220,160,60,0.9)', flexShrink: 0 }} />
                      <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(220,160,60,0.9)', fontFamily: 'var(--font-josefin)' }}>
                        Checklist Incomplete
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 200, color: 'var(--text-muted)', fontFamily: 'var(--font-urbanist)', marginBottom: '12px' }}>
                      Tools checklist is not fully packed. Move anyway?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingMove(undefined)}
                        className="flex-1 py-2 text-[9px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-60"
                        style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', fontFamily: 'var(--font-josefin)' }}
                      >
                        Go Back
                      </button>
                      <button
                        onClick={() => executeMove(pendingMove, true)}
                        disabled={isMoving}
                        className="flex-1 py-2 text-[9px] tracking-[0.2em] uppercase font-light flex items-center justify-center gap-1.5 transition-opacity hover:opacity-70"
                        style={{ border: '1px solid rgba(220,140,30,0.4)', color: 'rgba(220,160,60,0.9)', fontFamily: 'var(--font-josefin)' }}
                      >
                        {isMoving && <Loader2 size={9} className="animate-spin" />}
                        Continue Anyway
                      </button>
                    </div>
                  </div>
                )}

                {/* Stage buttons — full-width, easy to tap */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {moveTargets.map(target => (
                    <button
                      key={target.label}
                      onClick={() => handleMove(target.stage)}
                      disabled={isMoving || pendingMove !== undefined}
                      className="flex items-center justify-center gap-1.5 py-3 text-[9px] tracking-[0.15em] uppercase font-light transition-all"
                      style={{
                        border: `1px solid ${target.accent}`,
                        color: target.accent,
                        fontFamily: 'var(--font-josefin)',
                        background: `${target.accent}08`,
                        opacity: pendingMove !== undefined ? 0.3 : 1,
                      }}
                    >
                      {isMoving
                        ? <Loader2 size={9} className="animate-spin" />
                        : target.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 pt-5 space-y-6 pb-10">
                {/* Notes */}
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
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
                      <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
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
                    <Loader2 size={9} className="animate-spin" style={{ color: 'var(--text-dim)' }} />
                    <span className="text-[9px] tracking-widest uppercase font-light" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>Saving</span>
                  </div>
                )}

                {/* Dual Beam Cover Color (only for Dual Beam cases) */}
                {!card.isCustom && card.type === 'Dual Beam' && (
                  <div>
                    <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                      Dual Beam Cover Color
                    </label>
                    <input
                      value={dualBeamCoverColor}
                      onChange={e => setDualBeamCoverColor(e.target.value)}
                      onBlur={e => saveDualBeamColor(e.target.value)}
                      placeholder="e.g. Navy blue to match venue drapes"
                      className="w-full text-sm outline-none placeholder:opacity-20"
                      style={{ ...inputStyle, padding: '0 0 8px 0', fontSize: '13px' }}
                    />
                  </div>
                )}

                {/* Images */}
                <div>
                  <label className="block text-[9px] tracking-[0.28em] uppercase font-light mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                    Photos
                  </label>

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {images.map(img => (
                        <div key={img.id} className="relative group aspect-square overflow-hidden" style={{ background: '#080d10' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" className="w-full h-full object-cover opacity-75 group-hover:opacity-50 transition-opacity" />
                          <button
                            onClick={() => setLightboxUrl(img.url)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ZoomIn size={16} strokeWidth={1.5} style={{ color: '#ffffff' }} />
                          </button>
                          <button
                            onClick={() => handleRemoveImage(img.id, img.storage_path)}
                            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid var(--border-strong)' }}
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
                    style={{ color: 'var(--text-dim)', border: '1px solid var(--border)', padding: '8px 16px', fontFamily: 'var(--font-josefin)', letterSpacing: '0.15em', fontSize: '10px', textTransform: 'uppercase' }}
                  >
                    {isUploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    {isUploading ? 'Uploading' : 'Add Photos'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </div>

                {/* Serial Numbers (Pixel Brick and AX5 only) */}
                {!card.isCustom && (card.type === 'Pixel Brick' || card.type === 'AX5') && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[9px] tracking-[0.28em] uppercase font-light" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
                        Serial Numbers
                      </label>
                      {serialNumbers.filter(sn => sn.serial.trim()).length > 0 && (
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>
                          {serialNumbers.filter(sn => sn.serial.trim()).length} logged
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {serialNumbers.map((sn, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            value={sn.label}
                            onChange={e => {
                              const next = serialNumbers.map((s, i) => i === idx ? { ...s, label: e.target.value } : s);
                              setSerialNumbers(next);
                              saveSerialNumbers(next);
                            }}
                            placeholder={`${card.type} ${idx + 1}`}
                            style={{ ...inputStyle, fontSize: '12px', padding: '0 0 6px 0', flex: '1' }}
                            className="outline-none placeholder:opacity-20"
                          />
                          <input
                            value={sn.serial}
                            onChange={e => {
                              const next = serialNumbers.map((s, i) => i === idx ? { ...s, serial: e.target.value } : s);
                              setSerialNumbers(next);
                              saveSerialNumbers(next);
                            }}
                            placeholder="Serial #"
                            style={{ ...inputStyle, fontSize: '12px', padding: '0 0 6px 0', flex: '1' }}
                            className="outline-none placeholder:opacity-20"
                          />
                          {serialNumbers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = serialNumbers.filter((_, i) => i !== idx);
                                setSerialNumbers(next);
                                saveSerialNumbers(next);
                              }}
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center transition-opacity hover:opacity-60"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...serialNumbers, { label: '', serial: '' }];
                        setSerialNumbers(next);
                      }}
                      className="flex items-center gap-1.5 mt-3 text-[10px] tracking-[0.18em] uppercase font-light transition-opacity hover:opacity-60"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}
                    >
                      <Plus size={10} />
                      Add Serial Number
                    </button>
                  </div>
                )}

                {/* Tools Checklist */}
                {card.type === 'Tools' && (
                  <ToolsChecklist
                    checklistState={checklistState}
                    checklistPacked={checklistPacked}
                    onToggle={toggleChecklistItem}
                    onPackAll={handlePackAll}
                    isPackingAll={isPackingAll}
                  />
                )}
              </div>
            </div>
          </div>

      {/* Lightbox — plain conditional render, no framer-motion */}
      {lightboxUrl && (
        <>
          <div
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 70,
              background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
            }}
          />
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 71,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt=""
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '88vh', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-60"
              style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.6)' }}
            >
              <X size={14} style={{ color: 'rgba(255,255,255,0.8)' }} />
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ─── Tools Checklist sub-component ───────────────────────────────────────────

interface ToolsChecklistProps {
  checklistState: Record<string, boolean>;
  checklistPacked: boolean;
  onToggle: (id: string) => void;
  onPackAll: () => void;
  isPackingAll: boolean;
}

function ToolsChecklist({ checklistState, checklistPacked, onToggle, onPackAll, isPackingAll }: ToolsChecklistProps) {
  const checkedCount = ALL_CHECKLIST_ITEMS.filter(item => checklistState[item.id]).length;
  const allChecked = checkedCount === TOTAL_ITEMS;

  const drawerStyle: React.CSSProperties = {
    fontSize: '8px',
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-josefin)',
    marginBottom: '8px',
    marginTop: '16px',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <label style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)' }}>
          Tools Checklist
        </label>
        <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: allChecked ? 'rgba(120,200,140,0.8)' : 'var(--text-muted)', fontFamily: 'var(--font-urbanist)' }}>
          {checkedCount} / {TOTAL_ITEMS} packed
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px', marginBottom: '16px' }}>
        <div style={{ height: '100%', width: `${(checkedCount / TOTAL_ITEMS) * 100}%`, background: allChecked ? 'rgba(120,200,140,0.8)' : 'rgba(255,185,100,0.7)', borderRadius: '1px', transition: 'width 0.2s' }} />
      </div>

      {/* Packed banner */}
      {checklistPacked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(120,200,140,0.08)', border: '1px solid rgba(120,200,140,0.2)', padding: '10px 12px', marginBottom: '12px' }}>
          <CheckSquare size={12} style={{ color: 'rgba(120,200,140,0.8)' }} />
          <span style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(120,200,140,0.8)', fontFamily: 'var(--font-josefin)' }}>
            All Packed ✓
          </span>
        </div>
      )}

      {/* Drawers */}
      {[
        { label: 'Top Drawer', items: TOOLS_CHECKLIST.top },
        { label: 'Middle Drawer', items: TOOLS_CHECKLIST.middle },
        { label: 'Bottom Drawer', items: TOOLS_CHECKLIST.bottom },
      ].map(({ label, items }) => (
        <div key={label}>
          <div style={drawerStyle}>{label}</div>
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {items.map(item => {
              const checked = !!checklistState[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    textAlign: 'left',
                    transition: 'opacity 0.1s',
                  }}
                >
                  {checked
                    ? <CheckSquare size={13} style={{ color: 'rgba(120,200,140,0.7)', flexShrink: 0 }} />
                    : <Square size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  }
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 200,
                    color: checked ? 'var(--text-muted)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-urbanist)',
                    textDecoration: checked ? 'line-through' : 'none',
                    transition: 'color 0.15s, text-decoration 0.15s',
                  }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* All Packed button */}
      <button
        onClick={onPackAll}
        disabled={!allChecked || checklistPacked || isPackingAll}
        style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px',
          border: allChecked && !checklistPacked
            ? '1px solid rgba(120,200,140,0.5)'
            : '1px solid var(--border)',
          color: allChecked && !checklistPacked
            ? 'rgba(120,200,140,0.9)'
            : 'var(--text-dim)',
          fontFamily: 'var(--font-josefin)',
          fontSize: '10px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          cursor: allChecked && !checklistPacked ? 'pointer' : 'not-allowed',
          background: allChecked && !checklistPacked ? 'rgba(120,200,140,0.06)' : 'transparent',
        }}
      >
        {isPackingAll
          ? <Loader2 size={11} className="animate-spin" />
          : <CheckSquare size={11} />
        }
        {checklistPacked ? 'Packed' : 'All Packed ✓'}
      </button>

      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '20px 0' }} />
    </div>
  );
}
