'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, Search, Menu, X, Sun, Moon, ChevronDown } from 'lucide-react';
import Logo from './Logo';
import { usePalette } from '@/lib/commandPaletteContext';
import { useTheme } from '@/lib/themeContext';

const NAV_LINKS = [
  { href: '/events',    label: 'Events'      },
  { href: '/booking',   label: 'Booking'     },
  { href: '/inventory', label: 'Inventory'   },
  { href: '/war-room',  label: 'War Room'    },
  { href: '/team',      label: 'Team'        },
  { href: '/rundown',   label: 'Rundown'     },
  { href: '/schedule',  label: 'Schedule'    },
  { href: '/payroll',   label: 'Payroll'     },
];

const MORE_LINKS = [
  { href: '/calendar',      label: 'Calendar'       },
  { href: '/lookup',        label: 'Case Lookup'    },
  { href: '/incidents',     label: 'Incidents'      },
  { href: '/admin/payroll', label: 'Payroll Admin'  },
];

// Company call: every Monday at 11am ET
function getCallCountdown(): { label: string; isLive: boolean } {
  const now = new Date();
  // Convert to ET
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = etNow.getDay(); // 0=Sun, 1=Mon
  const hour = etNow.getHours();
  const min = etNow.getMinutes();

  // Is it currently Monday 11am-12pm ET?
  if (day === 1 && hour === 11) {
    return { label: 'Call is Live', isLive: true };
  }

  // Find next Monday 11am ET
  const next = new Date(etNow);
  const daysUntilMonday = (1 - day + 7) % 7 || (hour >= 12 ? 7 : 0);
  next.setDate(next.getDate() + daysUntilMonday);
  next.setHours(11, 0, 0, 0);

  const diffMs = next.getTime() - etNow.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  const remH = diffH % 24;
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffD > 0) return { label: `${diffD}d ${remH}h`, isLive: false };
  if (diffH > 0) return { label: `${diffH}h ${diffM}m`, isLive: false };
  return { label: `${diffM}m`, isLive: false };
}

export default function GlobalNav() {
  const pathname = usePathname();
  const { openPalette } = usePalette();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [callCountdown, setCallCountdown] = useState<{ label: string; isLive: boolean } | null>(null);

  useEffect(() => {
    setCallCountdown(getCallCountdown());
    const interval = setInterval(() => setCallCountdown(getCallCountdown()), 60000);
    return () => clearInterval(interval);
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const isLight = theme === 'light';
  const activeStyle = {
    color: 'var(--text-primary)',
    borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}`,
  };
  const inactiveStyle = {
    color: 'var(--text-muted)',
    borderBottom: '1px solid transparent',
  };

  return (
    <>
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--nav-bg)',
          borderBottom: '1px solid var(--nav-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" asLink={false} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {NAV_LINKS.map(link => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2.5 py-1.5 text-[9px] tracking-[0.18em] uppercase font-light transition-all whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-josefin)', ...(active ? activeStyle : inactiveStyle) }}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* More dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] tracking-[0.18em] uppercase font-light transition-all"
                style={{ fontFamily: 'var(--font-josefin)', color: MORE_LINKS.some(l => isActive(l.href)) ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: '1px solid transparent' }}
              >
                More <ChevronDown size={8} />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                    {MORE_LINKS.map(link => (
                      <Link key={link.href} href={link.href} onClick={() => setMoreOpen(false)}
                        className="block px-4 py-2.5 text-[9px] tracking-[0.18em] uppercase font-light"
                        style={{ fontFamily: 'var(--font-josefin)', color: isActive(link.href) ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Company call countdown — desktop */}
            {callCountdown && (
              <div className="hidden lg:flex items-center gap-1.5"
                style={{ fontSize: '9px', fontFamily: 'var(--font-josefin)', color: callCountdown.isLive ? 'rgb(34,197,94)' : 'var(--text-dim)', letterSpacing: '0.12em' }}>
                {callCountdown.isLive && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(34,197,94)', display: 'inline-block', animation: 'pulse-urgent 1.5s ease-in-out infinite' }} />
                )}
                {callCountdown.isLive ? 'Live' : `Mon · ${callCountdown.label}`}
              </div>
            )}

            <button
              onClick={() => openPalette()}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-josefin)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase' }}
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
              className="lg:hidden flex items-center justify-center w-8 h-8 transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-muted)' }}
            >
              {mobileOpen ? <X size={14} strokeWidth={1.5} /> : <Menu size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="lg:hidden px-5 pb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {[...NAV_LINKS, ...MORE_LINKS].map(link => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-[10px] tracking-[0.22em] uppercase font-light"
                  style={{ fontFamily: 'var(--font-josefin)', color: active ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}
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
