'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, List, Grid3X3, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Event, Shop } from '@/lib/types';
import GlobalNav from '@/components/GlobalNav';

const SHOP_ACCENT: Record<string, string> = {
  Orlando: 'rgba(100,160,210,0.8)',
  Dallas:  'rgba(210,160,80,0.8)',
};
const SHOP_BG: Record<string, string> = {
  Orlando: 'rgba(100,160,210,0.15)',
  Dallas:  'rgba(210,160,80,0.15)',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseLocal(s: string) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime()-a.getTime())/86400000);
}

function ArchiveConfirm({ event, onConfirm, onCancel, isDeleting }: {
  event: Event; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(7,12,14,0.92)', backdropFilter: 'blur(8px)' }} onClick={onCancel} />
      <motion.div
        className="relative w-full max-w-xs p-8"
        style={{ background: '#0c1317', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.97, y: 6 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <h3 className="text-base font-light tracking-[0.08em] mb-2" style={{ color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
          Archive Event?
        </h3>
        <p className="text-xs font-light mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          This hides the event from the board and calendar.
        </p>
        <p className="text-sm font-light mb-4" style={{ color: '#ffffff', fontFamily: 'var(--font-urbanist)', fontWeight: 200 }}>
          &quot;{event.name}&quot;
        </p>
        <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-josefin)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light flex items-center justify-center gap-1.5 transition-opacity hover:opacity-60"
            style={{ border: '1px solid rgba(255,100,100,0.3)', color: 'rgba(255,110,110,0.8)', fontFamily: 'var(--font-josefin)' }}>
            {isDeleting && <Loader2 size={10} className="animate-spin" />}
            {isDeleting ? 'Archiving' : 'Archive'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents]     = useState<Event[]>([]);
  const [loading, setLoading]   = useState(true);
  const [shopFilter, setShopFilter] = useState<Shop | 'all'>('all');
  const [view, setView]     = useState<'month' | 'agenda'>('month');
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting]       = useState(false);

  useEffect(() => {
    supabase.from('events').select('*')
      .is('archived_at', null)
      .order('event_start_date', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setEvents(data as Event[]);
        setLoading(false);
      });
  }, []);

  async function handleArchiveConfirm() {
    if (!deletingEvent) return;
    setIsDeleting(true);
    try {
      await supabase.from('events').update({ archived_at: new Date().toISOString() }).eq('id', deletingEvent.id);
      setEvents(prev => prev.filter(e => e.id !== deletingEvent.id));
      setDeletingEvent(null);
    } catch (err) { console.error(err); }
    finally { setIsDeleting(false); }
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y-1); }
    else setMonth(m => m-1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y+1); }
    else setMonth(m => m+1);
  }

  const filtered = events.filter(e =>
    shopFilter === 'all' || (e.primary_shop ?? 'Orlando') === shopFilter
  );

  // ── Month view helpers ──────────────────────────────────────────────────────
  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month+1, 0);
  const startPad  = firstDay.getDay();
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
  const cells: (Date|null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startPad + 1;
    if (d < 1 || d > lastDay.getDate()) return null;
    return new Date(year, month, d);
  });

  function eventsOnDay(day: Date): Event[] {
    return filtered.filter(e => {
      const start = e.event_start_date ? parseLocal(e.event_start_date) : null;
      const end   = e.event_end_date   ? parseLocal(e.event_end_date)   : start;
      if (!start) return false;
      const dayStr = toYMD(day);
      return dayStr >= toYMD(start) && dayStr <= toYMD(end!);
    });
  }

  // ── Agenda view ─────────────────────────────────────────────────────────────
  const agenda = filtered
    .filter(e => e.event_start_date)
    .sort((a,b) => (a.event_start_date!).localeCompare(b.event_start_date!));

  const pastAgenda   = agenda.filter(e => e.event_start_date && parseLocal(e.event_start_date) < today);
  const futureAgenda = agenda.filter(e => e.event_start_date && parseLocal(e.event_start_date) >= today);

  return (
    <div className="min-h-screen" style={{ background: '#070c0e' }}>
      <GlobalNav />

      {/* Header */}
      <div className="px-5 pt-8 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Schedule
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
            Calendar
          </h1>
          <div className="flex items-center gap-2">
            {/* Shop filter */}
            {(['all', 'Orlando', 'Dallas'] as const).map(s => (
              <button key={s} onClick={() => setShopFilter(s)}
                className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase font-light transition-all"
                style={{
                  fontFamily: 'var(--font-josefin)',
                  border: shopFilter === s ? `1px solid ${SHOP_ACCENT[s] ?? 'rgba(255,255,255,0.4)'}` : '1px solid rgba(255,255,255,0.1)',
                  color: shopFilter === s ? (SHOP_ACCENT[s] ?? '#fff') : 'rgba(255,255,255,0.25)',
                }}>
                {s}
              </button>
            ))}
            {/* View toggle */}
            <div className="flex" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {([['month', Grid3X3], ['agenda', List]] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className="w-8 h-8 flex items-center justify-center transition-all"
                  style={{ background: view === v ? 'rgba(255,255,255,0.06)' : 'transparent', color: view === v ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}>
                  <Icon size={12} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'month' ? (
            <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Month nav */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-60"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                  <ChevronLeft size={13} strokeWidth={1.5} />
                </button>
                <span style={{ fontFamily: 'var(--font-josefin)', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ffffff', fontWeight: 300 }}>
                  {MONTHS[month]} {year}
                </span>
                <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-60"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                  <ChevronRight size={13} strokeWidth={1.5} />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 px-5 pt-3 pb-1">
                {DAYS.map(d => (
                  <div key={d} style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', textAlign: 'center', padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 px-5 pb-8 gap-px" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {cells.map((day, i) => {
                  const dayEvents = day ? eventsOnDay(day) : [];
                  const isToday   = day ? sameDay(day, today) : false;
                  return (
                    <div key={i} style={{ background: '#070c0e', minHeight: '80px', padding: '6px 5px' }}>
                      {day && (
                        <>
                          <div style={{
                            fontSize: '11px', fontFamily: 'var(--font-josefin)', fontWeight: 300,
                            color: isToday ? '#ffffff' : 'rgba(255,255,255,0.3)',
                            background: isToday ? 'rgba(255,255,255,0.12)' : 'transparent',
                            borderRadius: isToday ? '50%' : 0,
                            width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '4px',
                          }}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(ev => {
                              const shop = ev.primary_shop ?? 'Orlando';
                              const isHov = hoveredEvent === ev.id;
                              return (
                                <div key={ev.id} className="relative group/pill"
                                  onMouseEnter={() => setHoveredEvent(ev.id)}
                                  onMouseLeave={() => setHoveredEvent(null)}>
                                  <button onClick={() => router.push(`/events/${ev.id}`)}
                                    className="w-full text-left transition-opacity"
                                    style={{ opacity: isHov ? 0.75 : 1 }}>
                                    <div style={{
                                      fontSize: '9px', fontFamily: 'var(--font-josefin)', fontWeight: 300,
                                      color: SHOP_ACCENT[shop], background: SHOP_BG[shop],
                                      padding: '1px 16px 1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      letterSpacing: '0.03em',
                                    }}>
                                      {ev.name}
                                    </div>
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); setDeletingEvent(ev); }}
                                    className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center opacity-0 group-hover/pill:opacity-100 transition-opacity"
                                    style={{ color: 'rgba(255,100,100,0.7)' }}
                                  >
                                    <X size={8} strokeWidth={2} />
                                  </button>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', padding: '0 2px' }}>
                                +{dayEvents.length - 3}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="agenda" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="px-5 py-6 max-w-2xl space-y-8">
              {futureAgenda.length > 0 && (
                <AgendaSection title="Upcoming" events={futureAgenda} onArchive={setDeletingEvent} />
              )}
              {pastAgenda.length > 0 && (
                <AgendaSection title="Past" events={pastAgenda} dim onArchive={setDeletingEvent} />
              )}
              {agenda.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontFamily: 'var(--font-urbanist)', fontWeight: 200, paddingTop: '24px' }}>
                  No events found.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {deletingEvent && (
          <ArchiveConfirm
            event={deletingEvent}
            onConfirm={handleArchiveConfirm}
            onCancel={() => setDeletingEvent(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AgendaSection({ title, events, dim, onArchive }: { title: string; events: Event[]; dim?: boolean; onArchive: (e: Event) => void }) {
  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '12px' }}>
        {title}
      </div>
      <div className="space-y-px">
        {events.map(event => {
          const shop = event.primary_shop ?? 'Orlando';
          const accent = SHOP_ACCENT[shop];
          const start = event.event_start_date ? new Date(event.event_start_date + 'T00:00:00') : null;
          const end   = event.event_end_date   ? new Date(event.event_end_date   + 'T00:00:00') : null;
          const days  = start && end ? daysBetween(start, end) + 1 : 1;
          const dateLabel = start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';

          return (
            <div key={event.id} className="group relative flex items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: dim ? 0.5 : 1 }}>
              <Link href={`/events/${event.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-4 py-4">
                  <div className="w-px self-stretch flex-shrink-0" style={{ background: accent, minHeight: '24px' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: '14px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.03em' }}>
                        {event.name}
                      </span>
                      <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, fontFamily: 'var(--font-josefin)' }}>
                        {shop}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>
                        {dateLabel}{days > 1 ? ` · ${days} days` : ''}
                      </span>
                      {event.location && (
                        <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>
                          {event.location}
                        </span>
                      )}
                      {event.load_by_date && (
                        <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
                          Load {new Date(event.load_by_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={12} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}
                    className="transition-transform group-hover:translate-x-0.5 duration-150" />
                </div>
              </Link>
              <button
                onClick={() => onArchive(event)}
                className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-60"
                style={{ color: 'rgba(255,100,100,0.6)' }}
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
