import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/navigation/Sidebar';
import ClientOnly from '@/components/ClientOnly';

export const metadata: Metadata = {
  title: 'SA Property Investment Hub | Real Estate Portfolio Dashboard',
  description:
    'Unified South African real estate investment dashboard for flips, rentals, capital sourcing, and deal flow with ZAR formatting and SARS tax calculations.',
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
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-screen pb-16 md:pb-0">
          <ClientOnly>{children}</ClientOnly>
        </div>
      </body>
    </html>
  );
}
