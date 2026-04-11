import type { Metadata, Viewport } from 'next';
import { Josefin_Sans, Urbanist } from 'next/font/google';
import './globals.css';
import ClientShell from '@/components/ClientShell';
import { SplashScreen } from '@/components/SplashScreen';

const josefin = Josefin_Sans({
  subsets: ['latin'],
  weight: ['100', '300', '400'],
  variable: '--font-josefin',
  display: 'swap',
});

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500'],
  variable: '--font-urbanist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Jacob Co — Production Operations',
  description: 'Jacob Co Creative — production operations for Orlando & Dallas',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Jacob Co',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#070c0e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${josefin.variable} ${urbanist.variable} h-full`}>
      <head>
        {/* Prevent FOUC: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('jcc-theme')||localStorage.getItem('jc-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full antialiased">
        <div className="grain-overlay" aria-hidden="true" />
        <SplashScreen />
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
