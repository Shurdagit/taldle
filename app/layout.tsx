import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TALDLE – Gissa Dagens Tal',
  description: 'Gissa ett tal mellan 1 och 1000. Nytt tal varje dag!',
  manifest: '/manifest.json',
  themeColor: '#080d18',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  openGraph: {
    title: 'TALDLE',
    description: 'Kan du gissa dagens tal på 10 försök?',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}