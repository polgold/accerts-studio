import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Accerts Productions',
  description: 'Production management and visual boards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="font-sans">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
