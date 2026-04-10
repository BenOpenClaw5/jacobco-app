'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

interface PopupInfo {
  location: GlobeLocation;
  x: number;
  y: number;
}

// Fallback locations if DB not yet seeded
const FALLBACK_LOCATIONS: GlobeLocation[] = [
  { id: '1', city: 'Dallas', state: 'Texas', country: 'USA', lat: 32.7767, lng: -96.7970, flag: '🇺🇸', state_name: 'Texas', note: null },
  { id: '2', city: 'Palm Beach', state: 'Florida', country: 'USA', lat: 26.7056, lng: -80.0364, flag: '🇺🇸', state_name: 'Florida', note: null },
  { id: '3', city: 'Seaside', state: 'Florida', country: 'USA', lat: 30.3266, lng: -86.1414, flag: '🇺🇸', state_name: 'Florida', note: null },
  { id: '4', city: 'Orlando', state: 'Florida', country: 'USA', lat: 28.5383, lng: -81.3792, flag: '🇺🇸', state_name: 'Florida', note: null },
];

export default function GlobeSection() {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<unknown>(null);
  const [locations, setLocations] = useState<GlobeLocation[]>([]);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadLocations() {
      try {
        const { data } = await supabase.from('globe_locations').select('*');
        setLocations(data && data.length > 0 ? (data as GlobeLocation[]) : FALLBACK_LOCATIONS);
      } catch {
        setLocations(FALLBACK_LOCATIONS);
      }
    }
    loadLocations();
  }, []);

  useEffect(() => {
    if (!globeRef.current || locations.length === 0 || loaded) return;
    setLoaded(true);

    // Dynamically import globe to avoid SSR issues
    import('react-globe.gl').then(mod => {
      const Globe = mod.default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const THREE = (window as any).THREE || {};

      if (!globeRef.current) return;

      const el = globeRef.current;
      const width = el.clientWidth;
      const height = Math.min(window.innerHeight * 0.65, 500);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globe = (Globe as any)()
        .width(width)
        .height(height)
        .backgroundColor('#000008')
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .atmosphereColor('rgba(160,190,255,0.25)')
        .atmosphereAltitude(0.15)
        .showGraticules(false)
        .pointsData(locations)
        .pointLat((d: GlobeLocation) => d.lat)
        .pointLng((d: GlobeLocation) => d.lng)
        .pointColor(() => 'rgba(255,210,100,0.9)')
        .pointAltitude(0.02)
        .pointRadius(0.4)
        .pointLabel(() => '')
        .onPointClick((point: GlobeLocation) => {
          // Get screen coords
          const coords = globe.getScreenCoords(point.lat, point.lng, 0.02);
          if (coords) {
            setPopup({ location: point, x: coords.x, y: coords.y });
          } else {
            setPopup({ location: point, x: width / 2, y: height / 2 });
          }
        })
        (el);

      // Auto-rotate
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.4;
      globe.controls().enableDamping = true;

      // Pause on interaction, resume after 3s
      function pauseRotation() {
        globe.controls().autoRotate = false;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          globe.controls().autoRotate = true;
        }, 3000);
      }

      el.addEventListener('pointerdown', pauseRotation);
      el.addEventListener('touchstart', pauseRotation);

      globeInstanceRef.current = globe;

      // Start with a nice view
      globe.pointOfView({ lat: 30, lng: -80, altitude: 2.2 }, 0);
    }).catch(console.error);

    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [locations, loaded]);

  // Handle resize
  useEffect(() => {
    function handleResize() {
      const globe = globeInstanceRef.current as { width?: (w: number) => void };
      if (globe?.width && globeRef.current) {
        globe.width(globeRef.current.clientWidth);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const height = typeof window !== 'undefined'
    ? Math.min(window.innerHeight * 0.65, 500)
    : 400;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={globeRef}
        style={{ width: '100%', height: `${height}px`, cursor: 'grab' }}
        onClick={() => {
          // Clicking on the globe bg dismisses popup
          if (popup) setPopup(null);
        }}
      />

      {/* Location count */}
      <div style={{ textAlign: 'center', paddingBottom: '32px', paddingTop: '16px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-josefin)' }}>
          {locations.length} event {locations.length === 1 ? 'location' : 'locations'}
        </span>
      </div>

      {/* Popup */}
      {popup && (
        <div
          className="fixed z-50"
          style={{
            left: Math.min(popup.x + 10, window.innerWidth - 200),
            top: Math.min(popup.y - 60, window.innerHeight - 120),
            background: 'rgba(10,10,10,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '12px 14px',
            minWidth: '160px',
            backdropFilter: 'blur(12px)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setPopup(null)}
            style={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.3)' }}
          >
            <X size={10} />
          </button>
          <div style={{ fontSize: '11px', fontWeight: 300, color: '#ffffff', fontFamily: 'var(--font-josefin)', letterSpacing: '0.05em', marginBottom: '2px', paddingRight: '16px' }}>
            {popup.location.flag} {popup.location.city}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-urbanist)' }}>
            {popup.location.state_name || popup.location.state}{popup.location.state && popup.location.country !== popup.location.state ? `, ${popup.location.country}` : ''}
          </div>
          {popup.location.note && (
            <div style={{ fontSize: '10px', fontWeight: 200, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-urbanist)', marginTop: '6px', fontStyle: 'italic' }}>
              {popup.location.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
