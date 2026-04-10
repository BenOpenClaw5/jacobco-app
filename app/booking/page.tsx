'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const pageAnim = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } };
import {
  Loader2, Plus, ChevronLeft, ChevronRight, ExternalLink, X,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Booking, InventoryCase, Shop, SHOPS } from '@/lib/types';
import GlobalNav from '@/components/GlobalNav';

// ─── Pricing ──────────────────────────────────────────────────────────────────

const LIGHT_PRICES: Record<string, number> = {
  'Dacore': 10, 'Pinspot': 25, 'Dual Beam': 15, 'Gobo': 50,
  'Super Spot': 100, 'Pixel Brick': 30, 'Pixel Tube': 40,
  'AX2': 50, 'AX5': 40, 'Plutos': 50, 'Chandelier': 10,
  'Dome Lights': 10, 'Haze': 200,
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  inquiry:   { label: 'Inquiry',   color: 'rgba(180,180,200,0.7)' },
  quoted:    { label: 'Quoted',    color: 'rgba(120,180,220,0.8)' },
  confirmed: { label: 'Confirmed', color: 'rgba(120,200,140,0.8)' },
  cancelled: { label: 'Cancelled', color: 'rgba(200,100,90,0.7)'  },
};

const EVENT_TYPES = ['Wedding', 'Corporate', 'Private Party', 'Concert', 'Other'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr + 'T00:00:00');
  const end   = new Date(endStr   + 'T00:00:00');
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

interface EquipmentSelection {
  lightCount: number;
  cases: string[];
  pricePerLight: number;
}

function selectOptimalCases(
  allCases: InventoryCase[],
  unavailableIds: Set<string>,
  type: string,
  lightCount: number,
): { caseIds: string[]; actualLights: number } {
  const available = allCases
    .filter(c => c.type === type && !unavailableIds.has(c.id) && c.actual_light_count > 0)
    .sort((a, b) => b.actual_light_count - a.actual_light_count || a.letter.localeCompare(b.letter));

  const selected: string[] = [];
  let total = 0;
  for (const c of available) {
    if (total >= lightCount) break;
    selected.push(c.id);
    total += c.actual_light_count;
  }
  return { caseIds: selected, actualLights: total };
}

// ─── Step 1: Event Details Form ───────────────────────────────────────────────

interface Step1Data {
  clientName: string;
  clientContact: string;
  eventName: string;
  startDate: string;
  endDate: string;
  billingDays: number;
  venue: string;
  eventType: string;
  budget: string;
  notes: string;
  shop: Shop;
}

function Step1Form({ data, onChange, onNext }: {
  data: Step1Data;
  onChange: (d: Partial<Step1Data>) => void;
  onNext: () => void;
}) {
  const fieldStyle: React.CSSProperties = {
    background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff', borderRadius: 0,
    fontFamily: 'var(--font-urbanist)', fontWeight: 200,
    fontSize: '14px', padding: '0 0 10px 0', width: '100%', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '9px', letterSpacing: '0.28em',
    textTransform: 'uppercase', fontWeight: 300,
    color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', marginBottom: '10px',
  };

  const canProceed = data.clientName.trim() && data.eventName.trim() && data.startDate;

  return (
    <div className="space-y-6 max-w-lg">
      {/* Client Name */}
      <div>
        <label style={labelStyle}>Client Name *</label>
        <input value={data.clientName} onChange={e => onChange({ clientName: e.target.value })}
          placeholder="The Martinez Family" style={fieldStyle} className="outline-none placeholder:opacity-20" autoFocus />
      </div>

      <div>
        <label style={labelStyle}>Client Contact</label>
        <input value={data.clientContact} onChange={e => onChange({ clientContact: e.target.value })}
          placeholder="Email or phone" style={fieldStyle} className="outline-none placeholder:opacity-20" />
      </div>

      <div>
        <label style={labelStyle}>Event Name *</label>
        <input value={data.eventName} onChange={e => onChange({ eventName: e.target.value })}
          placeholder="Martinez Wedding" style={fieldStyle} className="outline-none placeholder:opacity-20" />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {[
          { label: 'Event Start *', key: 'startDate' as const, value: data.startDate },
          { label: 'Event End',     key: 'endDate'   as const, value: data.endDate   },
        ].map(f => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input type="date" value={f.value} onChange={e => onChange({ [f.key]: e.target.value })}
              style={{ ...fieldStyle, colorScheme: 'dark' }} className="outline-none" />
          </div>
        ))}
      </div>

      {/* Billing Days */}
      <div>
        <label style={labelStyle}>How many days are we charging the client?</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={data.billingDays}
            onChange={e => onChange({ billingDays: Math.max(1, parseInt(e.target.value) || 1) })}
            style={{ ...fieldStyle, width: '80px' }}
            className="outline-none"
          />
          <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>
            billing day{data.billingDays !== 1 ? 's' : ''}
          </span>
        </div>
        {data.startDate && data.endDate && (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', marginTop: '6px', fontWeight: 200 }}>
            Event span: {daysBetween(data.startDate, data.endDate)} days · Billing: {data.billingDays} day{data.billingDays !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div>
        <label style={labelStyle}>Venue / Location</label>
        <input value={data.venue} onChange={e => onChange({ venue: e.target.value })}
          placeholder="Venue name or address" style={fieldStyle} className="outline-none placeholder:opacity-20" />
      </div>

      <div>
        <label style={labelStyle}>Event Type</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(t => (
            <button key={t} type="button" onClick={() => onChange({ eventType: t })}
              className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase font-light transition-all"
              style={{
                fontFamily: 'var(--font-josefin)',
                border: data.eventType === t ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: data.eventType === t ? '#ffffff' : 'rgba(255,255,255,0.3)',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Budget</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, bottom: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '14px' }}>$</span>
          <input type="number" value={data.budget} onChange={e => onChange({ budget: e.target.value })}
            placeholder="0" style={{ ...fieldStyle, paddingLeft: '16px' }} className="outline-none placeholder:opacity-20" />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Shop</label>
        <div className="flex gap-2">
          {SHOPS.map(s => (
            <button key={s} type="button" onClick={() => onChange({ shop: s })}
              className="flex-1 py-2 text-[9px] tracking-[0.2em] uppercase font-light transition-all"
              style={{
                fontFamily: 'var(--font-josefin)',
                border: data.shop === s ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: data.shop === s ? '#ffffff' : 'rgba(255,255,255,0.3)',
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea value={data.notes} onChange={e => onChange({ notes: e.target.value })} rows={2}
          placeholder="Additional details..."
          className="w-full resize-none outline-none placeholder:opacity-20 text-sm"
          style={{ ...fieldStyle, borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
      </div>

      <div className="pt-2">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full py-3.5 text-[10px] tracking-[0.3em] uppercase font-light transition-opacity"
          style={{
            border: '1px solid rgba(255,255,255,0.5)', color: '#ffffff',
            fontFamily: 'var(--font-josefin)', opacity: canProceed ? 1 : 0.35,
          }}
        >
          Select Equipment →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Equipment Selection ──────────────────────────────────────────────

interface TypeAvailability {
  type: string;
  cases: InventoryCase[];
  totalLights: number;
  pricePerLight: number;
}

function BudgetTracker({ budget, quoted }: { budget: number; quoted: number }) {
  const pct = budget > 0 ? Math.min(150, (quoted / budget) * 100) : 0;
  const overBudget = quoted > budget && budget > 0;
  const warning = !overBudget && pct >= 80;
  const barColor = overBudget ? 'rgba(220,80,70,0.9)' : warning ? 'rgba(220,165,60,0.9)' : 'rgba(120,200,140,0.85)';

  if (budget <= 0) return null;

  return (
    <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '20px', marginBottom: '24px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '16px' }}>
        Budget
      </div>
      <div className="flex items-baseline gap-4 mb-4">
        <div>
          <div style={{ fontSize: '26px', fontWeight: 100, color: overBudget ? 'rgba(220,80,70,0.9)' : '#ffffff', fontFamily: 'var(--font-josefin)', lineHeight: 1 }}>
            ${quoted.toLocaleString()}
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '4px' }}>
            Quoted
          </div>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>/</div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 200, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-josefin)', lineHeight: 1 }}>
            ${budget.toLocaleString()}
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginTop: '4px' }}>
            Budget
          </div>
        </div>
        {overBudget && (
          <div style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 200, color: 'rgba(220,80,70,0.9)', fontFamily: 'var(--font-urbanist)' }}>
            +${(quoted - budget).toLocaleString()} over
          </div>
        )}
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: barColor, borderRadius: '2px', transition: 'width 0.3s ease, background 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)' }}>
          ${Math.max(0, budget - quoted).toLocaleString()} remaining
        </span>
        <span style={{ fontSize: '9px', letterSpacing: '0.15em', color: overBudget ? 'rgba(220,80,70,0.7)' : 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-josefin)' }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

function Step2Equipment({ step1, allCases, unavailableIds, selection, onChangeSelection, days, onBack, onNext }: {
  step1: Step1Data;
  allCases: InventoryCase[];
  unavailableIds: Set<string>;
  selection: Record<string, EquipmentSelection>;
  onChangeSelection: (s: Record<string, EquipmentSelection>) => void;
  days: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const budget = parseFloat(step1.budget) || 0;

  // Non-chargeable types hidden from booking
  const NON_CHARGEABLE = new Set(['Tools', 'Air Wall Track', 'Circle Brackets', 'Clamp Brackets Tree', 'Tools Cases']);

  // Group available (chargeable) cases by type
  const byType: Record<string, InventoryCase[]> = {};
  for (const c of allCases) {
    if (NON_CHARGEABLE.has(c.type)) continue;
    if (unavailableIds.has(c.id)) continue;
    if (c.actual_light_count <= 0) continue;
    if (!byType[c.type]) byType[c.type] = [];
    byType[c.type].push(c);
  }

  const availableTypes: TypeAvailability[] = Object.entries(byType).map(([type, cases]) => ({
    type,
    cases,
    totalLights: cases.reduce((s, c) => s + c.actual_light_count, 0),
    pricePerLight: LIGHT_PRICES[type] ?? 10,
  })).sort((a, b) => a.type.localeCompare(b.type));

  const totalQuoted = Object.entries(selection).reduce((sum, [type, sel]) => {
    const price = LIGHT_PRICES[type] ?? 10;
    return sum + sel.lightCount * price * days;
  }, 0);

  function handleQuantityChange(type: string, lightCount: number, maxLights: number) {
    const clamped = Math.max(0, Math.min(lightCount, maxLights));
    if (clamped === 0) {
      const next = { ...selection };
      delete next[type];
      onChangeSelection(next);
      return;
    }
    const { caseIds } = selectOptimalCases(allCases, unavailableIds, type, clamped);
    onChangeSelection({
      ...selection,
      [type]: { lightCount: clamped, cases: caseIds, pricePerLight: LIGHT_PRICES[type] ?? 10 },
    });
  }

  return (
    <div>
      {/* Budget tracker (sticky) */}
      <div style={{ position: 'sticky', top: '57px', zIndex: 10, marginBottom: '0' }}>
        <BudgetTracker budget={budget} quoted={totalQuoted} />
      </div>

      {/* Quote line items */}
      {Object.keys(selection).length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '12px' }}>
            Quote Breakdown
          </div>
          {Object.entries(selection).map(([type, sel]) => {
            const subtotal = sel.lightCount * sel.pricePerLight * days;
            return (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-urbanist)' }}>
                  {type === 'Haze'
                    ? `Haze Machines × ${days}d`
                    : `${type}: ${sel.lightCount} lights × $${sel.pricePerLight}/light × ${days}d`}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', marginLeft: '16px', flexShrink: 0 }}>
                  ${subtotal.toLocaleString()}
                </span>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>Total</span>
            <span style={{ fontSize: '18px', fontWeight: 200, color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>${totalQuoted.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Available types */}
      <div className="space-y-4 max-w-lg">
        {availableTypes.length === 0 && (
          <div style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', paddingTop: '16px' }}>
            No equipment available for these dates.
          </div>
        )}
        {availableTypes.map(({ type, cases, totalLights, pricePerLight }) => {
          const sel = selection[type];
          const current = sel?.lightCount ?? 0;
          const subtotal = current * pricePerLight * days;
          const isHaze = type === 'Haze';
          const hazeOn = isHaze && current > 0;

          if (isHaze) {
            // Haze: binary toggle (machine, not per-light)
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (hazeOn) {
                    const next = { ...selection }; delete next['Haze']; onChangeSelection(next);
                  } else {
                    const { caseIds } = selectOptimalCases(allCases, unavailableIds, 'Haze', cases[0]?.actual_light_count ?? 1);
                    onChangeSelection({ ...selection, Haze: { lightCount: cases[0]?.actual_light_count ?? 1, cases: caseIds, pricePerLight } });
                  }
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  background: hazeOn ? 'rgba(196,154,42,0.08)' : '#0c1317',
                  border: hazeOn ? '1px solid rgba(196,154,42,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  padding: '18px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 300, color: hazeOn ? 'rgba(196,154,42,0.9)' : '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.05em' }}>
                    Haze Machines
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', marginTop: '3px' }}>
                    {cases.length} machine{cases.length !== 1 ? 's' : ''} available · ${pricePerLight}/day
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {hazeOn && (
                    <span style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(196,154,42,0.9)', fontFamily: 'var(--font-josefin)' }}>
                      ${subtotal.toLocaleString()}
                    </span>
                  )}
                  <div style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    background: hazeOn ? 'rgba(196,154,42,0.5)' : 'rgba(255,255,255,0.08)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: '3px', left: hazeOn ? '19px' : '3px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: hazeOn ? 'rgba(196,154,42,0.95)' : 'rgba(255,255,255,0.3)',
                      transition: 'left 0.2s, background 0.2s',
                    }} />
                  </div>
                </div>
              </button>
            );
          }

          return (
            <div key={type} style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.05em' }}>
                    {type}
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', marginTop: '3px' }}>
                    {cases.length} cases · {totalLights} lights available · ${pricePerLight}/light/day
                  </div>
                </div>
                {current > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 200, color: 'rgba(120,200,140,0.9)', fontFamily: 'var(--font-josefin)' }}>
                      ${subtotal.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(type, current - 1, totalLights)}
                  style={{ width: '32px', height: '32px', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px', fontWeight: 100 }}
                >
                  −
                </button>
                <div style={{ flex: 1 }}>
                  <input
                    type="range"
                    min={0}
                    max={totalLights}
                    value={current}
                    onChange={e => handleQuantityChange(type, parseInt(e.target.value), totalLights)}
                    style={{ width: '100%', accentColor: 'rgba(255,255,255,0.6)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(type, current + 1, totalLights)}
                  style={{ width: '32px', height: '32px', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px', fontWeight: 100 }}
                >
                  +
                </button>
                <div style={{ minWidth: '64px', textAlign: 'right' }}>
                  <span style={{ fontSize: '16px', fontWeight: 200, color: current > 0 ? '#ffffff' : 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
                    {current}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', marginLeft: '4px' }}>
                    lights
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 max-w-lg mt-8">
        <button onClick={onBack} className="flex-1 py-3 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
          style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}>
          ← Back
        </button>
        <button onClick={onNext} className="flex-1 py-3 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity"
          style={{ border: '1px solid rgba(255,255,255,0.5)', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
          Review Quote →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Summary + Confirm ────────────────────────────────────────────────

function Step3Summary({ step1, selection, days, totalPrice, onBack, onSaveQuote, onConfirmBooking, isSaving }: {
  step1: Step1Data;
  selection: Record<string, EquipmentSelection>;
  days: number;
  totalPrice: number;
  onBack: () => void;
  onSaveQuote: () => void;
  onConfirmBooking: () => void;
  isSaving: boolean;
}) {
  const labelStyle: React.CSSProperties = {
    fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase',
    fontWeight: 300, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)', marginBottom: '5px',
  };
  const valueStyle: React.CSSProperties = {
    fontSize: '14px', fontWeight: 200, color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-urbanist)',
  };

  return (
    <div className="max-w-lg space-y-6">
      <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '16px' }}>
          Client Details
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Client', value: step1.clientName },
            { label: 'Contact', value: step1.clientContact || '—' },
            { label: 'Event', value: step1.eventName },
            { label: 'Type', value: step1.eventType || '—' },
            { label: 'Venue', value: step1.venue || '—' },
            { label: 'Shop', value: step1.shop },
          ].map(f => (
            <div key={f.label}>
              <div style={labelStyle}>{f.label}</div>
              <div style={valueStyle}>{f.value}</div>
            </div>
          ))}
          <div>
            <div style={labelStyle}>Dates</div>
            <div style={valueStyle}>
              {step1.startDate}{step1.endDate && step1.endDate !== step1.startDate ? ` – ${step1.endDate}` : ''} · {days}d
            </div>
          </div>
          {step1.budget && <div>
            <div style={labelStyle}>Budget</div>
            <div style={valueStyle}>${parseFloat(step1.budget).toLocaleString()}</div>
          </div>}
        </div>
        {step1.notes && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={labelStyle}>Notes</div>
            <div style={{ ...valueStyle, fontSize: '13px', fontStyle: 'italic' }}>{step1.notes}</div>
          </div>
        )}
      </div>

      <div style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '16px' }}>
          Equipment & Pricing
        </div>
        {Object.keys(selection).length === 0 ? (
          <div style={{ fontSize: '13px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>No equipment selected.</div>
        ) : (
          <div>
            {Object.entries(selection).map(([type, sel]) => {
              const subtotal = sel.lightCount * sel.pricePerLight * days;
              return (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-urbanist)' }}>
                    {type}: {sel.lightCount} lights × ${sel.pricePerLight} × {days}d
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', flexShrink: 0, marginLeft: '16px' }}>
                    ${subtotal.toLocaleString()}
                  </span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-josefin)' }}>Total</span>
              <span style={{ fontSize: '22px', fontWeight: 200, color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>${totalPrice.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="py-3 px-5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
          style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}>
          ← Back
        </button>
        <button onClick={onSaveQuote} disabled={isSaving}
          className="flex-1 py-3 text-[10px] tracking-[0.25em] uppercase font-light flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ border: '1px solid rgba(120,180,220,0.4)', color: 'rgba(120,180,220,0.9)', fontFamily: 'var(--font-josefin)', opacity: isSaving ? 0.5 : 1 }}>
          {isSaving && <Loader2 size={11} className="animate-spin" />}
          Save as Quote
        </button>
        <button onClick={onConfirmBooking} disabled={isSaving}
          className="flex-1 py-3 text-[10px] tracking-[0.25em] uppercase font-light flex items-center justify-center gap-2 transition-opacity"
          style={{ border: '1px solid rgba(255,255,255,0.5)', color: '#ffffff', fontFamily: 'var(--font-josefin)', opacity: isSaving ? 0.5 : 1 }}>
          {isSaving && <Loader2 size={11} className="animate-spin" />}
          Confirm Booking
        </button>
      </div>
    </div>
  );
}

// ─── Booking list ─────────────────────────────────────────────────────────────

function BookingList({ onNew }: { onNew: () => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    supabase.from('bookings').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setBookings(data as Booking[]); setLoading(false); });
  }, []);

  const filtered = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter);

  function formatDate(d?: string) {
    if (!d) return null;
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div>
      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(['all', 'inquiry', 'quoted', 'confirmed', 'cancelled'] as const).map(s => {
          const config = s !== 'all' ? STATUS_CONFIG[s] : null;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase font-light transition-all"
              style={{
                fontFamily: 'var(--font-josefin)',
                border: statusFilter === s
                  ? `1px solid ${config?.color ?? 'rgba(255,255,255,0.4)'}`
                  : '1px solid rgba(255,255,255,0.1)',
                color: statusFilter === s
                  ? (config?.color ?? '#ffffff')
                  : 'rgba(255,255,255,0.3)',
              }}>
              {s === 'all' ? 'All' : config?.label ?? s}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '48px', color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          No bookings found.
        </div>
      ) : (
        <div>
          {filtered.map(b => {
            const cfg = STATUS_CONFIG[b.status];
            return (
              <div key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div className="min-w-0 flex-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.03em' }}>
                        {b.event_name}
                      </span>
                      <span className="text-[9px] tracking-[0.12em] uppercase font-light px-2 py-0.5"
                        style={{ color: cfg?.color, border: `1px solid ${cfg?.color}30`, fontFamily: 'var(--font-josefin)' }}>
                        {cfg?.label ?? b.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-urbanist)' }}>
                        {b.client_name}
                      </span>
                      {b.event_start_date && (
                        <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
                          {formatDate(b.event_start_date)}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>
                        {b.primary_shop}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {b.total_price != null && (
                      <div style={{ fontSize: '16px', fontWeight: 200, color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
                        ${b.total_price.toLocaleString()}
                      </div>
                    )}
                    {b.event_id && (
                      <Link href={`/events/${b.event_id}`}
                        style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(120,180,220,0.7)', fontFamily: 'var(--font-josefin)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', justifyContent: 'flex-end' }}>
                        Board <ExternalLink size={9} strokeWidth={1.5} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: s === step ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.15)',
            background: s < step ? 'rgba(255,255,255,0.08)' : 'transparent',
            fontSize: '10px', fontWeight: 300, fontFamily: 'var(--font-josefin)',
            color: s === step ? '#ffffff' : s < step ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
            transition: 'all 0.2s',
          }}>
            {s}
          </div>
          <span style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-josefin)', color: s === step ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)' }}>
            {s === 1 ? 'Details' : s === 2 ? 'Equipment' : 'Confirm'}
          </span>
          {s < 3 && <div style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const defaultStep1: Step1Data = {
  clientName: '', clientContact: '', eventName: '', startDate: '', endDate: '',
  billingDays: 1, venue: '', eventType: '', budget: '', notes: '', shop: 'Orlando',
};

interface PricingSetting { id: string; light_type: string; price_per_day: number; }

function PricingSettingsTab() {
  const [settings, setSettings] = useState<PricingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editVals, setEditVals] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('pricing_settings').select('*').order('light_type').then(({ data }) => {
      const d = (data ?? []) as PricingSetting[];
      setSettings(d);
      const vals: Record<string, string> = {};
      d.forEach(s => { vals[s.id] = String(s.price_per_day); });
      setEditVals(vals);
      setLoading(false);
    });
  }, []);

  async function savePrice(s: PricingSetting) {
    const newPrice = parseFloat(editVals[s.id] ?? String(s.price_per_day));
    if (isNaN(newPrice)) return;
    setSaving(s.id);
    await supabase.from('pricing_settings').update({ price_per_day: newPrice, updated_at: new Date().toISOString() }).eq('id', s.id);
    setSettings(prev => prev.map(p => p.id === s.id ? { ...p, price_per_day: newPrice } : p));
    setSaving(null);
  }

  const labelStyle = { fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' };

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={14} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} /></div>;

  return (
    <div className="space-y-1 mt-6">
      <div style={{ ...labelStyle, marginBottom: '16px' }}>Price per Light · per Day</div>
      {settings.map(s => (
        <div key={s.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontFamily: 'var(--font-josefin)', fontSize: '13px', fontWeight: 300, color: '#ffffff', letterSpacing: '0.04em' }}>{s.light_type}</span>
          <div className="flex items-center gap-2">
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>$</span>
            <input
              type="number"
              min={0}
              value={editVals[s.id] ?? ''}
              onChange={e => setEditVals(prev => ({ ...prev, [s.id]: e.target.value }))}
              onBlur={() => savePrice(s)}
              style={{
                width: '64px', background: 'transparent', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#ffffff',
                fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '14px',
                outline: 'none', textAlign: 'right', padding: '0 0 4px 0',
              }}
            />
            {saving === s.id && <Loader2 size={10} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />}
          </div>
        </div>
      ))}
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, marginTop: '16px' }}>
        Changes apply to new quotes only. Click outside a field to save.
      </p>
    </div>
  );
}

export default function BookingPage() {
  const [mode, setMode]   = useState<'list' | 'new' | 'pricing'>('list');
  const [step, setStep]   = useState(1);
  const [step1, setStep1] = useState<Step1Data>(defaultStep1);
  const [selection, setSelection] = useState<Record<string, EquipmentSelection>>({});
  const [allCases, setAllCases]   = useState<InventoryCase[]>([]);
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set());
  const [loadingCases, setLoadingCases]     = useState(false);
  const [isSaving, setIsSaving]   = useState(false);

  const days = step1.billingDays;

  const totalPrice = Object.entries(selection).reduce((sum, [type, sel]) => {
    return sum + sel.lightCount * (LIGHT_PRICES[type] ?? 10) * days;
  }, 0);

  async function loadAvailability() {
    if (!step1.startDate) return;
    setLoadingCases(true);
    try {
      const startDate = step1.startDate;
      const endDate   = step1.endDate || step1.startDate;

      const [casesRes, eventsRes] = await Promise.all([
        supabase.from('inventory_cases').select('*').order('sort_order'),
        supabase.from('events').select('id, event_start_date, event_end_date').is('archived_at', null),
      ]);

      const cases = (casesRes.data ?? []) as InventoryCase[];
      setAllCases(cases);

      // Find overlapping events
      const overlappingIds = (eventsRes.data ?? [])
        .filter((e: { event_start_date?: string; event_end_date?: string }) => {
          const eStart = e.event_start_date;
          const eEnd   = e.event_end_date ?? e.event_start_date;
          if (!eStart) return false;
          return eStart <= endDate && (eEnd ?? eStart) >= startDate;
        })
        .map((e: { id: string }) => e.id);

      if (overlappingIds.length > 0) {
        const { data: usedCards } = await supabase
          .from('event_cards')
          .select('inventory_case_id')
          .in('event_id', overlappingIds)
          .not('inventory_case_id', 'is', null);
        setUnavailableIds(new Set((usedCards ?? []).map((c: { inventory_case_id: string }) => c.inventory_case_id)));
      } else {
        setUnavailableIds(new Set());
      }
    } catch (err) { console.error(err); }
    finally { setLoadingCases(false); }
  }

  async function handleGoToStep2() {
    await loadAvailability();
    setStep(2);
  }

  async function saveBooking(status: 'quoted' | 'confirmed') {
    setIsSaving(true);
    try {
      const equipmentSelection = Object.fromEntries(
        Object.entries(selection).map(([type, sel]) => [type, sel])
      );

      let eventId: string | undefined;

      // If confirming, create the event too
      if (status === 'confirmed') {
        const { data: newEvent, error: evErr } = await supabase
          .from('events')
          .insert({
            name: step1.eventName,
            primary_shop: step1.shop,
            location: step1.venue || null,
            event_start_date: step1.startDate || null,
            event_end_date: step1.endDate || null,
            notes: step1.notes || null,
            last_updated_by: 'Booking System',
            last_updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (evErr) throw evErr;
        eventId = newEvent.id;

        // Add all selected cases to Invoice stage
        const cardInserts = Object.values(selection).flatMap(sel =>
          sel.cases.map(caseId => ({
            event_id: eventId,
            inventory_case_id: caseId,
            is_custom: false,
            stage: 'invoice',
            last_updated_by: 'Booking System',
            last_updated_at: new Date().toISOString(),
          }))
        );
        if (cardInserts.length > 0) {
          await supabase.from('event_cards').insert(cardInserts);
        }
      }

      // Save the booking record
      await supabase.from('bookings').insert({
        status,
        client_name: step1.clientName,
        client_contact: step1.clientContact || null,
        event_name: step1.eventName,
        event_start_date: step1.startDate || null,
        event_end_date: step1.endDate || null,
        venue: step1.venue || null,
        event_type: step1.eventType || null,
        budget: step1.budget ? parseFloat(step1.budget) : null,
        notes: step1.notes || null,
        primary_shop: step1.shop,
        equipment_selection: equipmentSelection,
        total_price: totalPrice,
        event_id: eventId ?? null,
        last_updated_at: new Date().toISOString(),
      });

      // Reset and go to list
      setStep1(defaultStep1);
      setSelection({});
      setStep(1);
      setMode('list');
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  }

  return (
    <motion.div {...pageAnim} className="min-h-screen" style={{ background: '#070c0e' }}>
      <GlobalNav />

      {/* Header */}
      <div className="px-5 pt-8 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Courtney's Tools
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
            {mode === 'list' ? 'Booking' : mode === 'pricing' ? 'Pricing' : 'New Booking'}
          </h1>
          <div className="flex items-center gap-2">
            {mode === 'list' && (
              <>
                <button onClick={() => setMode('pricing')}
                  className="px-3 py-2 text-[9px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)' }}>
                  Pricing
                </button>
                <button onClick={() => { setMode('new'); setStep(1); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-[9px] tracking-[0.2em] uppercase font-light transition-opacity hover:opacity-70"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-josefin)' }}>
                  <Plus size={10} strokeWidth={1.5} /> New
                </button>
              </>
            )}
            {(mode === 'new' || mode === 'pricing') && (
              <button onClick={() => { setMode('list'); setStep(1); }}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-50"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="px-5 py-6 max-w-2xl">
        {mode === 'pricing' ? (
          <PricingSettingsTab />
        ) : mode === 'list' ? (
          <BookingList onNew={() => { setMode('new'); setStep(1); }} />
        ) : (
          <>
            <StepIndicator step={step} />

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                  <Step1Form
                    data={step1}
                    onChange={d => setStep1(prev => ({ ...prev, ...d }))}
                    onNext={handleGoToStep2}
                  />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                  {loadingCases ? (
                    <div className="flex justify-center py-16">
                      <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  ) : (
                    <Step2Equipment
                      step1={step1}
                      allCases={allCases}
                      unavailableIds={unavailableIds}
                      selection={selection}
                      onChangeSelection={setSelection}
                      days={days}
                      onBack={() => setStep(1)}
                      onNext={() => setStep(3)}
                    />
                  )}
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                  <Step3Summary
                    step1={step1}
                    selection={selection}
                    days={days}
                    totalPrice={totalPrice}
                    onBack={() => setStep(2)}
                    onSaveQuote={() => saveBooking('quoted')}
                    onConfirmBooking={() => saveBooking('confirmed')}
                    isSaving={isSaving}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </motion.div>
  );
}
