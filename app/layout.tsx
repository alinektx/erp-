import type { Metadata } from 'next';
import { inter, jetbrainsMono } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus ERP - PDV',
  description: 'Sistema de Frente de Caixa Profissional',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="antialiased bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
