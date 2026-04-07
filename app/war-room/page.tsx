'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Radio } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Event, DisplayCard, InventoryCase, EventCard, STAGE_META, calcReadiness } from '@/lib/types';
import Logo from '@/components/Logo';

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOP_COLOR: Record<string, string> = {
  Orlando: 'rgba(100,160,210,0.85)',
  Dallas:  'rgba(210,160,80,0.85)',
};

const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dayStr  = DAYS_FULL[now.getDay()].toUpperCase();
  const dateStr = `${MONTHS_FULL[now.getMonth()].toUpperCase()} ${now.getDate()}, ${now.getFullYear()}`;

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px 36px', position: 'relative' }}>
      {/* Ambient glow behind the clock */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 60%, rgba(255,220,120,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          fontFamily: 'var(--font-josefin)',
          fontSize: 'clamp(52px, 10vw, 88px)',
          fontWeight: 100,
          letterSpacing: '0.06em',
          color: '#ffffff',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {hh}<span style={{ opacity: 0.4 }}>:</span>{mm}
        <span style={{ fontSize: '55%', opacity: 0.5, letterSpacing: '0.04em' }}>
          <span style={{ opacity: 0.4 }}>:</span>{ss}
        </span>
      </div>
      <div
        style={{
          marginTop: '10px',
          fontSize: '11px',
          letterSpacing: '0.35em',
          color: 'rgba(255,255,255,0.25)',
          fontFamily: 'var(--font-josefin)',
        }}
      >
        {dayStr} · {dateStr}
      </div>
    </div>
  );
}

// ─── Countdown logic ──────────────────────────────────────────────────────────

interface Countdown {
  overdue: boolean;
  days: number;
  hours: number;
  mins: number;
  urgency: 'normal' | 'warning' | 'critical';
}

function getCountdown(loadByDate: string | undefined, now: Date): Countdown | null {
  if (!loadByDate) return null;
  const loadBy = new Date(loadByDate + 'T00:00:00');
  const diffMs = loadBy.getTime() - now.getTime();
  if (diffMs < 0) return { overdue: true, days: 0, hours: 0, mins: 0, urgency: 'critical' };
  const days  = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const mins  = Math.floor((diffMs % 3600000) / 60000);
  const urgency = days < 3 ? 'critical' : days < 7 ? 'warning' : 'normal';
  return { overdue: false, days, hours, mins, urgency };
}

function CountdownDisplay({ cd }: { cd: Countdown }) {
  const color = cd.urgency === 'critical'
    ? 'rgba(255,100,90,0.95)'
    : cd.urgency === 'warning'
      ? 'rgba(220,165,60,0.95)'
      : 'rgba(200,220,240,0.9)';

  if (cd.overdue) {
    return (
      <div
        className="pulse-urgent"
        style={{ fontSize: '13px', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'var(--font-josefin)', fontWeight: 300, color }}
      >
        Overdue
      </div>
    );
  }

  const label = cd.days > 0
    ? `${cd.days}d ${cd.hours}h`
    : cd.hours > 0
      ? `${cd.hours}h ${cd.mins}m`
      : `${cd.mins}m`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
        Loads in
      </div>
      <div
        className={cd.urgency === 'critical' ? 'pulse-urgent' : ''}
        style={{ fontSize: '22px', fontWeight: 200, letterSpacing: '0.04em', fontFamily: 'var(--font-josefin)', color, lineHeight: 1 }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Readiness bar ────────────────────────────────────────────────────────────

function ReadinessBar({ score }: { score: number }) {
  const barColor = score >= 80 ? 'rgba(120,200,140,0.85)'
    : score >= 40 ? 'rgba(210,165,70,0.85)'
    : 'rgba(220,100,80,0.75)';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '28px', fontWeight: 100, color: barColor, fontFamily: 'var(--font-josefin)', lineHeight: 1 }}>
          {score}%
        </span>
        <span style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
          Ready
        </span>
      </div>
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', width: '100%', borderRadius: '1px' }}>
        <div style={{ height: '100%', width: `${score}%`, background: barColor, borderRadius: '1px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ─── Team chips ───────────────────────────────────────────────────────────────

function TeamChips({ members }: { members: string[] }) {
  if (!members.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
      {members.map(m => (
        <span
          key={m}
          style={{
            fontSize: '9px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-josefin)',
            color: 'rgba(255,200,130,0.8)',
            background: 'rgba(255,185,100,0.08)',
            border: '1px solid rgba(255,185,100,0.18)',
            padding: '3px 8px',
          }}
        >
          {m}
        </span>
      ))}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface WarEventData {
  event: Event;
  displayCards: DisplayCard[];
}

function WarEventCard({ data, now }: { data: WarEventData; now: Date }) {
  const { event, displayCards } = data;
  const score = calcReadiness(displayCards);
  const cd    = getCountdown(event.load_by_date, now);
  const shop  = event.primary_shop ?? 'Orlando';
  const shopColor = SHOP_COLOR[shop] ?? 'rgba(255,255,255,0.4)';
  const caseCount = displayCards.filter(c => c.stage).length;

  const isCritical = cd?.urgency === 'critical';

  const formatDateRange = () => {
    if (!event.event_start_date) return null;
    const start = new Date(event.event_start_date + 'T00:00:00');
    const end   = event.event_end_date ? new Date(event.event_end_date + 'T00:00:00') : start;
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (start.getTime() === end.getTime()) {
      return start.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    }
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  };

  return (
    <Link href={`/events/${event.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          background: 'rgba(12,19,23,0.96)',
          border: isCritical ? '1px solid rgba(255,80,70,0.25)' : '1px solid rgba(255,255,255,0.07)',
          boxShadow: isCritical ? '0 0 24px rgba(255,60,50,0.06), inset 0 0 0 0 transparent' : 'none',
          padding: '28px 28px 24px',
          marginBottom: '16px',
          transition: 'border-color 0.2s',
        }}
      >
        {/* Top row: name + shop badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: shopColor, fontFamily: 'var(--font-josefin)', marginBottom: '6px' }}>
              {shop}
            </div>
            <div style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 300, letterSpacing: '0.04em', color: '#ffffff', fontFamily: 'var(--font-josefin)', lineHeight: 1.2 }}>
              {event.name}
            </div>
            {formatDateRange() && (
              <div style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-urbanist)', marginTop: '6px' }}>
                {formatDateRange()}
              </div>
            )}
          </div>
          {cd && <CountdownDisplay cd={cd} />}
        </div>

        {/* Readiness */}
        <ReadinessBar score={score} />

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '3px' }}>
              Cases
            </div>
            <div style={{ fontSize: '18px', fontWeight: 200, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-josefin)' }}>
              {caseCount}
            </div>
          </div>
          {(event.team_members?.length ?? 0) > 0 && (
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '6px' }}>
                Team
              </div>
              <TeamChips members={event.team_members ?? []} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ marginBottom: '20px', opacity: 0.15 }}>
        <Radio size={40} strokeWidth={0.8} style={{ margin: '0 auto', color: '#ffffff' }} />
      </div>
      <div style={{ fontSize: '14px', fontWeight: 300, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)' }}>
        No active events.
      </div>
      <div style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-urbanist)', marginTop: '8px' }}>
        The stage is clear.
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WarRoomPage() {
  const [warEvents, setWarEvents] = useState<WarEventData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [now, setNow]             = useState(new Date());

  // Tick now every second for countdown accuracy
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch active events that haven't ended yet (or have no end date)
      const { data: events, error: evErr } = await supabase
        .from('events')
        .select('*')
        .is('archived_at', null)
        .or(`event_end_date.gte.${today},event_end_date.is.null`)
        .order('load_by_date', { ascending: true, nullsFirst: false });

      if (evErr) throw evErr;
      if (!events?.length) { setWarEvents([]); setLoading(false); return; }

      const eventIds = events.map((e: Event) => e.id);

      // Fetch inventory cases and all event cards
      const [casesRes, cardsRes] = await Promise.all([
        supabase.from('inventory_cases').select('*').order('sort_order'),
        supabase.from('event_cards').select('*').in('event_id', eventIds),
      ]);

      const cases = (casesRes.data ?? []) as InventoryCase[];
      const cards = (cardsRes.data ?? []) as EventCard[];

      // Build display cards per event
      const result: WarEventData[] = events.map((event: Event) => {
        const eventCards = cards.filter(c => c.event_id === event.id);
        const displayCards: DisplayCard[] = eventCards
          .filter(ec => ec.stage)
          .map(ec => {
            const ic = cases.find(c => c.id === ec.inventory_case_id);
            return {
              displayId: ec.id,
              eventCardId: ec.id,
              inventoryCaseId: ec.inventory_case_id,
              type: ic?.type ?? ec.custom_name ?? 'Custom',
              letter: ic?.letter ?? '',
              displayName: ic ? `${ic.type} ${ic.letter}` : (ec.custom_name ?? 'Custom'),
              isCustom: ec.is_custom,
              stage: ec.stage,
            };
          });
        return { event, displayCards };
      });

      setWarEvents(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(() => loadData(), 60000);
    return () => clearInterval(id);
  }, [loadData]);

  return (
    <div style={{ background: '#070c0e', minHeight: '100vh' }}>
      {/* Header bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'rgba(7,12,14,0.97)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <Logo size="sm" asLink />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'rgba(120,200,140,0.7)',
              animation: 'pulse-urgent 3s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
            Live · refreshes every 60s
          </span>
        </div>
      </header>

      {/* Clock */}
      <LiveClock />

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 24px' }} />

      {/* Event cards */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 60px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : warEvents.length === 0 ? (
          <EmptyState />
        ) : (
          warEvents.map(data => (
            <WarEventCard key={data.event.id} data={data} now={now} />
          ))
        )}

        {/* Last refresh */}
        {!loading && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.1)', fontFamily: 'var(--font-josefin)' }}>
              Last updated {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
