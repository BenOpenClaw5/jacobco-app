'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, Search, Menu, X, Sun, Moon } from 'lucide-react';
import Logo from './Logo';
import { usePalette } from '@/lib/commandPaletteContext';
import { useTheme } from '@/lib/themeContext';

const NAV_LINKS = [
  { href: '/events',    label: 'Events'    },
  { href: '/calendar',  label: 'Calendar'  },
  { href: '/war-room',  label: 'War Room'  },
  { href: '/booking',   label: 'Booking'   },
  { href: '/inventory', label: 'Inventory' },
  { href: '/schedule',  label: 'Schedule'  },
  { href: '/team',      label: 'The Team'  },
];

const DRAWER_EXTRA = [
  { href: '/lookup',        label: 'Lookup'   },
  { href: '/payroll',       label: 'Payroll'  },
  { href: '/incidents',     label: 'Incidents'},
];

export default function GlobalNav() {
  const pathname = usePathname();
  const { openPalette } = usePalette();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const isLight = theme === 'light';

  return (
    <>
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" asLink={false} />
          </Link>

          {/* Desktop nav — scrollable on intermediate sizes */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {NAV_LINKS.map(link => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2.5 py-1.5 text-[9px] tracking-[0.18em] uppercase font-light transition-all whitespace-nowrap"
                  style={{
                    fontFamily: 'var(--font-josefin)',
                    color: active
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    borderBottom: active
                      ? `1px solid ${isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}`
                      : '1px solid transparent',
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
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-josefin)',
                fontSize: '9px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              <Command size={10} strokeWidth={1.5} />
              <span>Command</span>
              <span style={{ opacity: 0.5 }}>⌘K</span>
            </button>

            <button
              onClick={() => openPalette()}
              className="sm:hidden flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <Search size={12} strokeWidth={1.5} />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {isLight ? <Moon size={12} strokeWidth={1.5} /> : <Sun size={12} strokeWidth={1.5} />}
            </button>

            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-muted)' }}
            >
              {mobileOpen ? <X size={14} strokeWidth={1.5} /> : <Menu size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div
            className="md:hidden px-5 pb-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            {[...NAV_LINKS, ...DRAWER_EXTRA].map(link => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-[10px] tracking-[0.22em] uppercase font-light"
                  style={{
                    fontFamily: 'var(--font-josefin)',
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
