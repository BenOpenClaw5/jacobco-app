'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
const pageAnim = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } };
import { Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ReturnIncident } from '@/lib/types';
import GlobalNav from '@/components/GlobalNav';

const TYPE_META = {
  missing: { label: 'Missing Items', icon: AlertTriangle, color: 'rgba(220,100,80,0.8)'  },
  note:    { label: 'Note / Damage', icon: FileText,      color: 'rgba(220,160,80,0.8)'  },
  ok:      { label: 'Returned OK',   icon: CheckCircle,   color: 'rgba(120,200,140,0.7)' },
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<ReturnIncident[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'all' | 'unresolved'>('unresolved');
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('return_incidents')
        .select('*, inventory_case:inventory_cases(id,type,letter,shop), event:events(id,name)')
        .neq('type', 'ok')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setIncidents(data as ReturnIncident[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resolve(id: string) {
    setResolving(id);
    try {
      await supabase.from('return_incidents').update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: 'Guest User',
      }).eq('id', id);
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolved: true } : i));
    } catch (err) { console.error(err); }
    finally { setResolving(null); }
  }

  const displayed = filter === 'unresolved'
    ? incidents.filter(i => !i.resolved)
    : incidents;

  const unresolvedCount = incidents.filter(i => !i.resolved).length;

  return (
    <motion.div {...pageAnim} className="min-h-screen" style={{ background: '#070c0e' }}>
      <GlobalNav />

      <div className="px-5 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)', marginBottom: '8px' }}>
          Return Processing
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 300, letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'var(--font-josefin)' }}>
              Incidents
            </h1>
            {!loading && unresolvedCount > 0 && (
              <p style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(220,100,80,0.7)', fontFamily: 'var(--font-urbanist)', marginTop: '4px' }}>
                {unresolvedCount} unresolved
              </p>
            )}
          </div>
          <div className="flex gap-1.5">
            {(['unresolved', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-[9px] tracking-[0.15em] uppercase font-light transition-all"
                style={{
                  fontFamily: 'var(--font-josefin)',
                  border: filter === f ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  color: filter === f ? '#ffffff' : 'rgba(255,255,255,0.25)',
                }}>
                {f === 'unresolved' ? 'Open' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : displayed.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontFamily: 'var(--font-urbanist)', fontWeight: 200, paddingTop: '24px' }}>
            {filter === 'unresolved' ? 'No open incidents.' : 'No incidents recorded.'}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-px">
            {displayed.map(incident => {
              const meta = TYPE_META[incident.type];
              const Icon = meta.icon;
              return (
                <div key={incident.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    padding: '16px 0',
                    opacity: incident.resolved ? 0.45 : 1,
                  }}>
                  <div className="flex items-start gap-3">
                    <Icon size={13} strokeWidth={1.5} style={{ color: meta.color, flexShrink: 0, marginTop: '2px' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: 'var(--font-josefin)', fontSize: '13px', color: '#ffffff', fontWeight: 300 }}>
                          {incident.inventory_case
                            ? `${incident.inventory_case.type} ${incident.inventory_case.letter}`
                            : 'Unknown Case'}
                        </span>
                        <span style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: meta.color, fontFamily: 'var(--font-josefin)' }}>
                          {meta.label}
                        </span>
                        {incident.resolved && (
                          <span style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(120,200,140,0.6)', fontFamily: 'var(--font-josefin)' }}>
                            Resolved
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {incident.event && (
                          <Link href={`/events/${incident.event.id}`}
                            style={{ fontSize: '11px', fontWeight: 200, color: 'rgba(100,160,210,0.7)', fontFamily: 'var(--font-urbanist)' }}
                            className="hover:opacity-70 transition-opacity">
                            {incident.event.name}
                          </Link>
                        )}
                        {incident.inventory_case?.shop && (
                          <span style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>
                            {incident.inventory_case.shop}
                          </span>
                        )}
                        <span style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-urbanist)' }}>
                          {new Date(incident.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {incident.type === 'missing' && incident.missing_count && (
                        <div style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(220,100,80,0.7)', fontFamily: 'var(--font-urbanist)', marginTop: '4px' }}>
                          {incident.missing_count} light{incident.missing_count !== 1 ? 's' : ''} missing
                        </div>
                      )}
                      {incident.note && (
                        <div style={{ fontSize: '12px', fontWeight: 200, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-urbanist)', marginTop: '4px', lineHeight: 1.6 }}>
                          {incident.note}
                        </div>
                      )}
                    </div>

                    {!incident.resolved && (
                      <button onClick={() => resolve(incident.id)} disabled={!!resolving}
                        className="flex-shrink-0 px-2.5 py-1.5 text-[8px] tracking-[0.15em] uppercase font-light transition-opacity hover:opacity-60"
                        style={{ border: '1px solid rgba(120,200,140,0.3)', color: 'rgba(120,200,140,0.7)', fontFamily: 'var(--font-josefin)' }}>
                        {resolving === incident.id ? <Loader2 size={9} className="animate-spin" /> : 'Resolve'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
