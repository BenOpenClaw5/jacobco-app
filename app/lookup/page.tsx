'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const pageAnim = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } };
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { InventoryCase, EventCard, Event, Shop } from '@/lib/types';
import GlobalNav from '@/components/GlobalNav';

const SHOP_ACCENT: Record<Shop, string> = {
  Orlando: 'rgba(100,160,210,0.8)',
  Dallas:  'rgba(210,160,80,0.8)',
};

interface CaseResult extends InventoryCase {
  event?: Event;
  stage?: string;
}

export default function LookupPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CaseResult[]>([]);
  const [allCases, setAllCases] = useState<CaseResult[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [casesRes, cardsRes] = await Promise.all([
        supabase.from('inventory_cases').select('*').order('sort_order'),
        supabase.from('event_cards').select('*, event:events(id,name,primary_shop,archived_at)').not('stage', 'is', null),
      ]);

      const caseMap = new Map<string, { event: Event; stage: string }>();
      (cardsRes.data as (EventCard & { event: Event })[])?.forEach(card => {
        if (card.inventory_case_id && card.event && !card.event.archived_at) {
          caseMap.set(card.inventory_case_id, { event: card.event, stage: card.stage! });
        }
      });

      const enriched: CaseResult[] = (casesRes.data as InventoryCase[]).map(c => ({
        ...c,
        ...caseMap.get(c.id),
      }));
      setAllCases(enriched);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      allCases.filter(c =>
        `${c.type} ${c.letter}`.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.letter.toLowerCase().includes(q) ||
        (c.event?.name ?? '').toLowerCase().includes(q)
      ).slice(0, 20)
    );
  }, [query, allCases]);

  const showAll = !query.trim();

  return (
    <motion.div {...pageAnim} className="min-h-screen" style={{ background: '#070c0e' }}>
      <GlobalNav />

      <div className="px-5 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Case Lookup
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '20px' }}>
          Where is this case?
        </h1>

        {/* Search input */}
        <div className="flex items-center gap-3 max-w-lg" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '10px' }}>
          <Search size={14} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search case name, type, or event…"
            style={{
              flex: 1,
              background: 'transparent', border: 'none', outline: 'none',
              color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200, fontSize: '15px',
            }}
            className="placeholder:opacity-20"
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-josefin)', fontSize: '9px' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : showAll ? (
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '16px' }}>
              {allCases.length} cases in system
            </div>
            <div className="space-y-px">
              {allCases.slice(0, 30).map(c => <CaseRow key={c.id} c={c} />)}
              {allCases.length > 30 && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)', fontWeight: 200, paddingTop: '12px' }}>
                  Search to find specific cases…
                </div>
              )}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontFamily: 'var(--font-urbanist)', fontWeight: 200, paddingTop: '16px' }}>
            No cases match &quot;{query}&quot;
          </div>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-px">
              <div style={{ fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '12px' }}>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map(c => <CaseRow key={c.id} c={c} />)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function CaseRow({ c }: { c: CaseResult }) {
  const shopAccent = SHOP_ACCENT[c.shop ?? 'Orlando'];
  return (
    <div className="flex items-center gap-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="w-px self-stretch" style={{ background: shopAccent, minHeight: '20px', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontFamily: 'var(--font-josefin)', fontSize: '13px', color: '#ffffff', fontWeight: 300, letterSpacing: '0.04em' }}>
            {c.type} {c.letter}
          </span>
          <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: shopAccent, fontFamily: 'var(--font-josefin)' }}>
            {c.shop ?? 'Orlando'}
          </span>
        </div>
        {c.event ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(100,160,210,0.8)', fontFamily: 'var(--font-urbanist)' }}>
              {c.event.name}
            </span>
            {c.stage && (
              <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
                {c.stage}
              </span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(120,200,140,0.6)', fontFamily: 'var(--font-urbanist)', marginTop: '2px' }}>
            Available at {c.shop ?? 'Orlando'}
          </div>
        )}
      </div>
      {c.event && (
        <Link href={`/events/${c.event.id}`}
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 transition-opacity hover:opacity-60"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>
          <ArrowRight size={11} strokeWidth={1.5} />
        </Link>
      )}
    </div>
  );
}
