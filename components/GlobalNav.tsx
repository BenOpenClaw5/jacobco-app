'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, Search, Menu, X } from 'lucide-react';
import Logo from './Logo';
import { usePalette } from '@/lib/commandPaletteContext';

const NAV_LINKS = [
  { href: '/events', label: 'Events' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/lookup', label: 'Lookup' },
];

export default function GlobalNav() {
  const pathname = usePathname();
  const { openPalette } = usePalette();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'rgba(7,12,14,0.97)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" asLink={false} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-[9px] tracking-[0.2em] uppercase font-light transition-all"
                  style={{
                    fontFamily: 'var(--font-josefin)',
                    color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.28)',
                    borderBottom: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPalette()}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 transition-opacity hover:opacity-70"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: 'var(--font-josefin)',
                fontSize: '9px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              <Command size={10} strokeWidth={1.5} />
              <span>Command</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>⌘K</span>
            </button>

            {/* Mobile search / command */}
            <button
              onClick={() => openPalette()}
              className="sm:hidden flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            >
              <Search size={12} strokeWidth={1.5} />
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {mobileOpen ? <X size={14} strokeWidth={1.5} /> : <Menu size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div
            className="md:hidden px-5 pb-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            {NAV_LINKS.map(link => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-[10px] tracking-[0.22em] uppercase font-light"
                  style={{
                    fontFamily: 'var(--font-josefin)',
                    color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/payroll"
              onClick={() => setMobileOpen(false)}
              className="block py-3 text-[10px] tracking-[0.22em] uppercase font-light"
              style={{ fontFamily: 'var(--font-josefin)', color: 'rgba(255,255,255,0.18)' }}
            >
              Payroll
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
