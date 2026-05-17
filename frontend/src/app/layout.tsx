import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AppProviders } from '@/components/providers/app-providers';
import { AuthProvider } from '@/hooks/useAuth';
import { siteName } from '@/lib/utils';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: siteName,
  description: 'A bespoke blog platform with editorial workflow and public publishing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full font-sans">
        <AppProviders>
          <AuthProvider>{children}</AuthProvider>
        </AppProviders>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
