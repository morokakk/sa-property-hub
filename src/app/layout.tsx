import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/navigation/Sidebar';
import ClientOnly from '@/components/ClientOnly';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.moremelaproperties.co.za'),
  title: 'Moremela Property Investment Hub | Real Estate Portfolio Dashboard',
  description:
    'Unified South African real estate investment dashboard for flips, rentals, capital sourcing, and deal flow with ZAR formatting and SARS tax calculations.',
  openGraph: {
    title: 'Moremela Property Investment Hub',
    description: 'South African real estate underwriting, flips, rentals & deal flow in ZAR.',
    url: 'https://www.moremelaproperties.co.za',
    siteName: 'Moremela Properties',
    images: [{ url: '/apple-icon.png', width: 180, height: 180, alt: 'Moremela Properties' }],
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Moremela Property Investment Hub',
    images: ['/apple-icon.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=4', sizes: 'any' },
      { url: '/icon-48.png?v=4', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png?v=4', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png?v=4', sizes: '192x192', type: 'image/png' },
      { url: '/moremela-icon.svg?v=4', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico?v=4',
    apple: '/apple-icon.png?v=4',
  },
};

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Moremela Property Hub',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: 'https://www.moremelaproperties.co.za',
  publisher: {
    '@type': 'Organization',
    name: 'Moremela Properties (Pty) Ltd',
    identifier: '2026/838397/07',
    logo: 'https://www.moremelaproperties.co.za/icon-192.png',
  },
  description:
    'South African property underwriting for SARS transfer duty, LSSA conveyancing tariffs, flips, and rentals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-slate-50 min-h-screen flex flex-col md:flex-row antialiased selection:bg-emerald-500 selection:text-white"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <PostHogProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-x-clip min-h-screen pb-16 md:pb-0">
            <ClientOnly>{children}</ClientOnly>
          </div>
        </PostHogProvider>
      </body>
    </html>
  );
}
