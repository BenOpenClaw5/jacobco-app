'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

interface GlobeLocation {
  id: string;
  city: string;
  state: string | null;
  country: string;
  lat: number;
  lng: number;
  flag: string | null;
  state_name: string | null;
  note: string | null;
}

// Dynamic import of react-globe.gl — must be SSR disabled (Three.js)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.2)',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', animation: 'pulse-urgent 2s ease-in-out infinite' }} />
    </div>
  ),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as React.ComponentType<any>;

const FALLBACK_LOCATIONS: GlobeLocation[] = [
  { id: '1', city: 'Dallas', state: 'Texas', country: 'USA', lat: 32.7767, lng: -96.7970, flag: '🇺🇸', state_name: 'Texas', note: null },
  { id: '2', city: 'Palm Beach', state: 'Florida', country: 'USA', lat: 26.7056, lng: -80.0364, flag: '🇺🇸', state_name: 'Florida', note: null },
  { id: '3', city: 'Seaside', state: 'Florida', country: 'USA', lat: 30.3266, lng: -86.1414, flag: '🇺🇸', state_name: 'Florida', note: null },
  { id: '4', city: 'Orlando', state: 'Florida', country: 'USA', lat: 28.5383, lng: -81.3792, flag: '🇺🇸', state_name: 'Florida', note: null },
];

export default function GlobeSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [locations, setLocations] = useState<GlobeLocation[]>([]);
  const [selected, setSelected] = useState<GlobeLocation | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);

  // Load locations from Supabase
  useEffect(() => {
    supabase.from('globe_locations').select('*').then(({ data, error }) => {
      if (error || !data || data.length === 0) setLocations(FALLBACK_LOCATIONS);
      else setLocations(data as GlobeLocation[]);
    });
  }, []);

  // ResizeObserver for container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  function handlePointClick(point: object) {
    setSelected(point as GlobeLocation);
  }

  function pauseRotation() {
    if (!globeRef.current) return;
    globeRef.current.controls().autoRotate = false;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (globeRef.current) globeRef.current.controls().autoRotate = true;
    }, 3000);
  }

  const containerH = Math.min(typeof window !== 'undefined' ? window.innerHeight * 0.65 : 500, 500);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: `${containerH}px`,
          minHeight: '400px',
          position: 'relative',
          background: '#000008',
          cursor: 'grab',
        }}
        onPointerDown={pauseRotation}
        onTouchStart={pauseRotation}
        onClick={() => selected && setSelected(null)}
      >
        {dimensions.w > 0 && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Globe
            width={dimensions.w}
            height={containerH}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
            atmosphereColor="rgba(100,150,255,0.15)"
            atmosphereAltitude={0.15}
            showAtmosphere={true}
            showGraticules={false}
            animateIn={true}
            pointsData={locations}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => 'rgba(255,210,100,0.9)'}
            pointAltitude={0.02}
            pointRadius={0.4}
            pointLabel={() => ''}
            onPointClick={handlePointClick}
            onGlobeReady={(globe: unknown) => {
              globeRef.current = globe;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const g = globe as any;
              if (g?.controls) {
                g.controls().autoRotate = true;
                g.controls().autoRotateSpeed = 0.4;
                g.controls().enableDamping = true;
                g.pointOfView({ lat: 30, lng: -80, altitude: 2.2 }, 0);
              }
            }}
          />
        )}
      </div>

      {/* Location count */}
      <div style={{ textAlign: 'center', padding: '16px 0 32px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
          {locations.length} event {locations.length === 1 ? 'location' : 'locations'}
        </span>
      </div>

      {/* Popup */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            bottom: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,10,10,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '12px 16px',
            minWidth: '160px',
            backdropFilter: 'blur(12px)',
            zIndex: 50,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setSelected(null)}
            style={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={10} />
          </button>
          <div style={{ fontSize: '11px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.05em', marginBottom: '2px', paddingRight: '16px' }}>
            {selected.flag} {selected.city}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)' }}>
            {selected.state_name || selected.state}
            {selected.country && selected.country !== 'USA' ? `, ${selected.country}` : ''}
          </div>
          {selected.note && (
            <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', marginTop: '6px', fontStyle: 'italic' }}>
              {selected.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
