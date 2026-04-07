import type { Metadata, Viewport } from 'next';
import { Josefin_Sans, Urbanist } from 'next/font/google';
import './globals.css';
import ClientShell from '@/components/ClientShell';

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
      <body className="min-h-full antialiased">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
