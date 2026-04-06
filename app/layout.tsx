import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'Jacob Co — Event Prep Board',
  description: 'Luxury event lighting production management',
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
  themeColor: '#08080A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
