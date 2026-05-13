import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Skill Router — AI Skills Marketplace',
  description:
    'A 3-agent skills marketplace that plans, executes, and synthesizes multi-skill finance workflows.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sans.variable} ${mono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
