'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { InventoryCase, EventCard, Event, Shop } from '@/lib/types';
import GlobalNav from '@/components/GlobalNav';

const SHOP_ACCENT: Record<Shop, string> = {
  Orlando: 'rgba(100,160,210,0.8)',
  Dallas:  'rgba(210,160,80,0.8)',
};

// ─── Price per light (fallback until DB column is populated) ─────────────────
const PRICE_PER_LIGHT: Record<string, number> = {
  'Dacore': 179, 'Pinspot': 150, 'Dual Beam': 189, 'Pixel Brick': 400,
  'Pixel Tube': 500, 'AX2': 1500, 'AX5': 775, 'Plutos': 2000,
  'Gobo': 0, 'Super Spot': 0, 'Chandelier': 0, 'Dome Lights': 0,
  'Circle Brackets': 0, 'Air Wall Track': 0, 'Clamp Brackets Tree': 0,
};

function caseValue(c: { type: string; actual_light_count?: number; standard_light_count?: number; price_per_light?: number }): number {
  const ppl = (c as { price_per_light?: number }).price_per_light ?? PRICE_PER_LIGHT[c.type] ?? 0;
  const lights = c.actual_light_count ?? c.standard_light_count ?? 0;
  return ppl * lights;
}

interface CaseWithContext extends InventoryCase {
  event?: Event;
  stage?: string;
}

interface TypeSummary {
  type: string;
  cases: CaseWithContext[];
  totalLights: number;
  available: number;
  assigned: number;
  issues: number;
  orlandoCount: number;
  dallasCount: number;
}

function pct(actual: number, standard: number): number {
  if (standard === 0) return 100;
  return Math.min(100, Math.round((actual / standard) * 100));
}

export default function InventoryPage() {
  const [cases, setCases] = useState<CaseWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [transferring, setTransferring] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, cardsRes, eventsRes] = await Promise.all([
        supabase.from('inventory_cases').select('*').order('sort_order'),
        supabase.from('event_cards').select('*, event:events(id,name,primary_shop,archived_at)').not('stage', 'is', null),
        supabase.from('events').select('id,name,primary_shop').is('archived_at', null),
      ]);

      const activeCaseMap = new Map<string, { event: Event; stage: string }>();
      (cardsRes.data as (EventCard & { event: Event })[])?.forEach(card => {
        if (card.inventory_case_id && card.event && !card.event.archived_at) {
          activeCaseMap.set(card.inventory_case_id, { event: card.event, stage: card.stage! });
        }
      });

      const enriched: CaseWithContext[] = (casesRes.data as InventoryCase[]).map(c => ({
        ...c,
        ...activeCaseMap.get(c.id),
      }));
      setCases(enriched);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleTransfer(caseId: string, to: Shop) {
    setTransferring(caseId);
    try {
      await supabase.from('inventory_cases').update({ shop: to, last_updated_by: 'Guest User', last_updated_at: new Date().toISOString() }).eq('id', caseId);
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, shop: to } : c));
    } catch (err) { console.error(err); }
    finally { setTransferring(null); }
  }

  const filtered = shop === 'all' ? cases : cases.filter(c => c.shop === shop);

  // Group by type
  const typeSummaries: TypeSummary[] = [];
  const types = [...new Set(filtered.map(c => c.type))];
  for (const type of types) {
    const typeCases = filtered.filter(c => c.type === type);
    typeSummaries.push({
      type,
      cases: typeCases,
      totalLights: typeCases.reduce((s, c) => s + (c.actual_light_count ?? c.standard_light_count ?? 0), 0),
      available: typeCases.filter(c => !c.event).length,
      assigned: typeCases.filter(c => !!c.event).length,
      issues: typeCases.filter(c => c.has_issue).length,
      orlandoCount: typeCases.filter(c => c.shop === 'Orlando').length,
      dallasCount: typeCases.filter(c => c.shop === 'Dallas').length,
    });
  }

  function toggleExpand(type: string) {
    setExpanded(prev => {
      const s = new Set(prev);
      if (s.has(type)) s.delete(type); else s.add(type);
      return s;
    });
  }

  // Totals
  const total = {
    cases: filtered.length,
    lights: filtered.reduce((s, c) => s + (c.actual_light_count ?? c.standard_light_count ?? 0), 0),
    available: filtered.filter(c => !c.event).length,
    assigned: filtered.filter(c => !!c.event).length,
    issues: filtered.filter(c => c.has_issue).length,
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <GlobalNav />

      {/* Header */}
      <div className="px-5 pt-8 pb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Case Management
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: 'var(--text-primary)', fontFamily: 'var(--font-josefin)' }}>
            Inventory
          </h1>
          {/* Shop filter */}
          <div className="flex gap-1.5">
            {(['all', 'Orlando', 'Dallas'] as const).map(s => (
              <button key={s} onClick={() => setShop(s)}
                className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase font-light transition-all"
                style={{
                  fontFamily: 'var(--font-josefin)',
                  border: shop === s ? `1px solid ${SHOP_ACCENT[s as Shop] ?? 'rgba(255,255,255,0.35)'}` : '1px solid rgba(255,255,255,0.1)',
                  color: shop === s ? (SHOP_ACCENT[s as Shop] ?? '#fff') : 'rgba(255,255,255,0.25)',
                }}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        {!loading && (
          <>
            {/* Total inventory value */}
            {(() => {
              const totalValue = cases.reduce((sum, c) => sum + caseValue(c), 0);
              return totalValue > 0 ? (
                <div className="mt-4 mb-2">
                  <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)', marginBottom: '4px' }}>
                    Total Inventory Value
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 100, color: 'var(--text-primary)', fontFamily: 'var(--font-josefin)', letterSpacing: '0.02em' }}>
                    ${totalValue.toLocaleString()}
                  </div>
                </div>
              ) : null;
            })()}
            <div className="flex gap-6 mt-4 flex-wrap">
              {[
                { label: 'Cases', val: total.cases },
                { label: 'Available', val: total.available, color: 'rgba(120,200,140,0.7)' },
                { label: 'Assigned', val: total.assigned, color: 'rgba(100,160,210,0.7)' },
                { label: 'Issues', val: total.issues, color: total.issues > 0 ? 'rgba(220,160,80,0.8)' : 'var(--text-dim)' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div style={{ fontSize: '20px', fontWeight: 100, color: color ?? 'var(--text-secondary)', fontFamily: 'var(--font-josefin)', letterSpacing: '0.03em' }}>
                    {val}
                  </div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-josefin)' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : (
          <div className="space-y-px">
            {typeSummaries.map(summary => (
              <div key={summary.type} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Type header row */}
                <button
                  className="w-full text-left"
                  onClick={() => toggleExpand(summary.type)}
                >
                  <div className="flex items-center gap-4 py-4 hover:opacity-80 transition-opacity">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                      <div className="flex items-center gap-2">
                        {expanded.has(summary.type)
                          ? <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                          : <ChevronRight size={11} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
                        <span style={{ fontFamily: 'var(--font-josefin)', fontSize: '13px', fontWeight: 300, color: '#ffffff', letterSpacing: '0.04em' }}>
                          {summary.type}
                        </span>
                        {summary.issues > 0 && (
                          <AlertTriangle size={11} style={{ color: 'rgba(220,160,80,0.8)', flexShrink: 0 }} />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-urbanist)' }}>
                          {summary.cases.length} cases
                        </span>
                        {shop === 'all' && (
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
                            <span style={{ color: SHOP_ACCENT.Orlando }}>{summary.orlandoCount}O</span>{' '}
                            <span style={{ color: SHOP_ACCENT.Dallas }}>{summary.dallasCount}D</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(120,200,140,0.7)', fontFamily: 'var(--font-urbanist)' }}>
                        {summary.available} avail.
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(100,160,210,0.7)', fontFamily: 'var(--font-urbanist)' }}>
                        {summary.assigned} assigned
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded cases */}
                <AnimatePresence>
                  {expanded.has(summary.type) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-5 pb-4 space-y-2">
                        {summary.cases.map(c => {
                          const fullPct = pct(c.actual_light_count ?? c.standard_light_count ?? 0, c.standard_light_count ?? 0);
                          const isPartial = c.standard_light_count > 0 && fullPct < 100;
                          const shopAccent = SHOP_ACCENT[c.shop];
                          return (
                            <div key={c.id}
                              style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', padding: '12px 14px' }}>
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span style={{ fontFamily: 'var(--font-josefin)', fontSize: '13px', color: '#ffffff', fontWeight: 300, letterSpacing: '0.05em' }}>
                                      {c.type} {c.letter}
                                    </span>
                                    <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: shopAccent, fontFamily: 'var(--font-josefin)' }}>
                                      {c.shop}
                                    </span>
                                    {isPartial && (
                                      <span style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(220,160,80,0.8)', fontFamily: 'var(--font-josefin)' }}>
                                        Partial
                                      </span>
                                    )}
                                    {c.has_issue && (
                                      <span style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(220,100,80,0.8)', fontFamily: 'var(--font-josefin)' }}>
                                        Issue
                                      </span>
                                    )}
                                  </div>

                                  {c.event ? (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(100,160,210,0.8)', fontFamily: 'var(--font-urbanist)' }}>
                                        {c.event.name}
                                      </span>
                                      {c.stage && (
                                        <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
                                          {c.stage}
                                        </span>
                                      )}
                                      <Link href={`/events/${c.event.id}`}
                                        onClick={e => e.stopPropagation()}
                                        style={{ color: 'rgba(255,255,255,0.2)' }}
                                        className="hover:opacity-60 transition-opacity flex items-center"
                                      >
                                        <ArrowRight size={10} strokeWidth={1.5} />
                                      </Link>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(120,200,140,0.6)', fontFamily: 'var(--font-urbanist)', marginTop: '3px' }}>
                                      Available at {c.shop}
                                    </div>
                                  )}

                                  {c.standard_light_count > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.08)', maxWidth: '80px', position: 'relative' }}>
                                        <div style={{ height: '100%', width: `${fullPct}%`, background: isPartial ? 'rgba(220,160,80,0.6)' : 'rgba(120,200,140,0.6)', transition: 'width 0.3s' }} />
                                      </div>
                                      <span style={{ fontSize: '9px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)' }}>
                                        {c.actual_light_count ?? c.standard_light_count}/{c.standard_light_count}
                                      </span>
                                    </div>
                                  )}

                                  {c.issue_note && (
                                    <div style={{ fontSize: '10px', color: 'rgba(220,100,80,0.7)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, marginTop: '4px' }}>
                                      {c.issue_note}
                                    </div>
                                  )}

                                  {/* Per-case value */}
                                  {caseValue(c) > 0 && (
                                    <div style={{ fontSize: '10px', fontWeight: 200, color: 'var(--text-dim)', fontFamily: 'var(--font-urbanist)', marginTop: '4px' }}>
                                      ${caseValue(c).toLocaleString()} case value
                                    </div>
                                  )}
                                </div>

                                {/* Transfer button */}
                                <button
                                  onClick={() => handleTransfer(c.id, c.shop === 'Orlando' ? 'Dallas' : 'Orlando')}
                                  disabled={!!transferring}
                                  className="flex-shrink-0 px-2.5 py-1.5 text-[8px] tracking-[0.15em] uppercase font-light transition-opacity hover:opacity-60"
                                  style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.25)',
                                    fontFamily: 'var(--font-josefin)',
                                    opacity: transferring === c.id ? 0.5 : 1,
                                  }}
                                >
                                  {transferring === c.id ? (
                                    <Loader2 size={9} className="animate-spin" />
                                  ) : (
                                    `→ ${c.shop === 'Orlando' ? 'Dallas' : 'Orlando'}`
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
