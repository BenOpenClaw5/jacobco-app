'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const pageAnim = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } };
import { ChevronLeft, ChevronRight, Loader2, X, Users } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import GlobalNav from '@/components/GlobalNav';

// ─── Team roster and colors ───────────────────────────────────────────────────

const TEAM_MEMBERS = ['Abby', 'Ben', 'Courtney', 'Drew', 'Eden', 'Gus', 'Jacob', 'Jace', 'Joseph', 'Max', 'Mia', 'Tommy', 'Van'];

const MEMBER_COLORS: Record<string, string> = {
  Abby:     '#7BC8B2',
  Ben:      '#6A8FC8',
  Courtney: '#B07FD8',
  Drew:     '#E09B56',
  Eden:     '#E07B8A',
  Gus:      '#6BBE6B',
  Jacob:    '#5B9BD5',
  Jace:     '#56C1A8',
  Joseph:   '#C48FC0',
  Max:      '#D4A85A',
  Mia:      '#E8A884',
  Tommy:    '#8BC5D8',
  Van:      '#A8C577',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseLocal(s: string) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

// ─── Who's Free logic ─────────────────────────────────────────────────────────

function getAvailabilityForDate(date: Date, events: Event[], selectedMembers: string[]) {
  const dateStr = toYMD(date);
  const busyMap: Record<string, string[]> = {}; // member → event names

  for (const ev of events) {
    if (!(ev.team_members?.length)) continue;
    const start = ev.event_start_date ?? ev.load_by_date;
    const end   = ev.event_end_date ?? start;
    if (!start) continue;
    if (dateStr >= start && dateStr <= (end ?? start)) {
      for (const member of ev.team_members ?? []) {
        if (!busyMap[member]) busyMap[member] = [];
        busyMap[member].push(ev.name);
      }
    }
  }

  const pool = selectedMembers.length > 0 ? selectedMembers : TEAM_MEMBERS;
  const available = pool.filter(m => !busyMap[m]);
  const busy = pool.filter(m => !!busyMap[m]).map(m => ({ name: m, events: busyMap[m] }));
  return { available, busy };
}

// ─── Member selector chip ─────────────────────────────────────────────────────

function MemberChip({ name, selected, onToggle }: { name: string; selected: boolean; onToggle: () => void }) {
  const color = MEMBER_COLORS[name] ?? '#ffffff';
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 10px',
        border: selected ? `1px solid ${color}60` : '1px solid rgba(255,255,255,0.1)',
        background: selected ? `${color}18` : 'transparent',
        color: selected ? color : 'rgba(255,255,255,0.35)',
        fontFamily: 'var(--font-josefin)',
        fontSize: '9px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
    >
      {selected && (
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      )}
      {name}
    </button>
  );
}

// ─── Calendar month view ──────────────────────────────────────────────────────

function eventsOnDay(day: Date, events: Event[], selectedMembers: string[]): Event[] {
  const dayStr = toYMD(day);
  return events.filter(ev => {
    // Must have at least one selected team member (or show all if no selection)
    const members = ev.team_members ?? [];
    if (selectedMembers.length > 0 && !members.some(m => selectedMembers.includes(m))) return false;
    const start = ev.event_start_date ?? ev.load_by_date;
    const end   = ev.event_end_date ?? start;
    if (!start) return false;
    return dayStr >= start && dayStr <= (end ?? start);
  });
}

function EventPill({ event, selectedMembers }: { event: Event; selectedMembers: string[] }) {
  const members = (event.team_members ?? []).filter(m =>
    selectedMembers.length === 0 || selectedMembers.includes(m)
  );
  // Use first matching member's color, or generic
  const firstColor = members.length > 0 ? (MEMBER_COLORS[members[0]] ?? 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.4)';
  const multiColor = members.length > 1;

  return (
    <Link href={`/events/${event.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{
        fontSize: '8px',
        fontFamily: 'var(--font-josefin)',
        fontWeight: 300,
        color: firstColor,
        background: `${firstColor}18`,
        padding: '1px 4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        borderLeft: `2px solid ${firstColor}`,
      }}>
        {multiColor && (
          <div style={{ display: 'flex', gap: '1.5px' }}>
            {members.slice(0, 3).map(m => (
              <div key={m} style={{ width: '4px', height: '4px', borderRadius: '50%', background: MEMBER_COLORS[m] ?? '#fff', flexShrink: 0 }} />
            ))}
          </div>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.name}</span>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [checkDate, setCheckDate] = useState('');

  useEffect(() => {
    supabase.from('events').select('*')
      .is('archived_at', null)
      .order('event_start_date', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setEvents(data as Event[]);
        setLoading(false);
      });
  }, []);

  function toggleMember(name: string) {
    setSelectedMembers(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y-1); }
    else setMonth(m => m-1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y+1); }
    else setMonth(m => m+1);
  }

  // Calendar grid
  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month+1, 0);
  const startPad  = firstDay.getDay();
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
  const cells: (Date|null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startPad + 1;
    if (d < 1 || d > lastDay.getDate()) return null;
    return new Date(year, month, d);
  });

  // Who's free
  const checkDateParsed = checkDate ? parseLocal(checkDate) : null;
  const availability = checkDateParsed ? getAvailabilityForDate(checkDateParsed, events, selectedMembers) : null;

  return (
    <motion.div {...pageAnim} className="min-h-screen" style={{ background: '#070c0e' }}>
      <GlobalNav />

      {/* Header */}
      <div className="px-5 pt-8 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Team
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '20px' }}>
          Schedule
        </h1>

        {/* Member selector */}
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '10px' }}>
            Filter by team member {selectedMembers.length > 0 && `· ${selectedMembers.length} selected`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {TEAM_MEMBERS.map(name => (
              <MemberChip
                key={name}
                name={name}
                selected={selectedMembers.includes(name)}
                onToggle={() => toggleMember(name)}
              />
            ))}
            {selectedMembers.length > 0 && (
              <button
                onClick={() => setSelectedMembers([])}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: 'var(--font-josefin)',
                  fontSize: '9px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                <X size={8} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
        </div>
      ) : (
        <>
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

          {/* Day headers */}
          <div className="grid grid-cols-7 px-5 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', textAlign: 'center', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-5 pb-8 gap-px" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {cells.map((day, i) => {
              const dayEvents = day ? eventsOnDay(day, events, selectedMembers) : [];
              const isToday   = day ? sameDay(day, today) : false;
              return (
                <div key={i} style={{ background: '#070c0e', minHeight: '80px', padding: '6px 4px' }}>
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
                        {dayEvents.slice(0, 3).map(ev => (
                          <EventPill key={ev.id} event={ev} selectedMembers={selectedMembers} />
                        ))}
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

          {/* Who's Free */}
          <div className="px-5 py-8 max-w-lg" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
              Availability
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)', marginBottom: '20px' }}>
              Who&apos;s Free?
            </h2>

            <div>
              <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-josefin)', marginBottom: '10px' }}>
                Check availability on
              </label>
              <input
                type="date"
                value={checkDate}
                onChange={e => setCheckDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-urbanist)',
                  fontWeight: 200,
                  fontSize: '14px',
                  padding: '0 0 8px 0',
                  outline: 'none',
                  colorScheme: 'dark',
                  width: '200px',
                }}
              />
            </div>

            <AnimatePresence>
              {availability && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ marginTop: '24px' }}
                  className="space-y-6"
                >
                  {/* Available */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(120,200,140,0.8)' }} />
                      <span style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(120,200,140,0.7)', fontFamily: 'var(--font-josefin)' }}>
                        Available · {availability.available.length}
                      </span>
                    </div>
                    {availability.available.length === 0 ? (
                      <div style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>
                        No one available this day.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {availability.available.map(name => {
                          const color = MEMBER_COLORS[name] ?? '#ffffff';
                          return (
                            <span key={name} style={{
                              fontSize: '9px',
                              letterSpacing: '0.14em',
                              textTransform: 'uppercase',
                              fontFamily: 'var(--font-josefin)',
                              color,
                              background: `${color}14`,
                              border: `1px solid ${color}40`,
                              padding: '4px 10px',
                            }}>
                              {name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Busy */}
                  {availability.busy.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(220,110,90,0.7)' }} />
                        <span style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(220,110,90,0.7)', fontFamily: 'var(--font-josefin)' }}>
                          Assigned · {availability.busy.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {availability.busy.map(({ name, events: evs }) => {
                          const color = MEMBER_COLORS[name] ?? '#ffffff';
                          return (
                            <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                              <span style={{
                                fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                                fontFamily: 'var(--font-josefin)', color, flexShrink: 0,
                                minWidth: '64px',
                              }}>
                                {name}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)' }}>
                                {evs.join(', ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Legend */}
          {selectedMembers.length > 0 && (
            <div className="px-5 pb-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {selectedMembers.map(name => {
                  const color = MEMBER_COLORS[name] ?? '#ffffff';
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-josefin)' }}>
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
