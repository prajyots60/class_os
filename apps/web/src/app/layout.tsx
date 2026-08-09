import type { Metadata } from 'next';
import { Inter, Manrope, Poppins, Nunito } from 'next/font/google';
import { Providers } from '../providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CoachingOS — Engineering Foundation',
  description: 'Operating system for founder-led coaching institutes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${poppins.variable} ${nunito.variable}`}
    >
      <body className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
