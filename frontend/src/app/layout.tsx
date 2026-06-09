import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlushFit AI — Cabinet Cut-List Generator',
  description:
    'Precision parametric math for frameless cabinet boxes. Enter your target dimensions and get an instant, professional-grade cut-list with side panels, bottom panel, stretchers, and doors.',
  keywords: ['cabinet making', 'cut list', 'parametric design', 'woodworking', 'frameless cabinet'],
  openGraph: {
    title: 'FlushFit AI',
    description: 'Precision parametric cut-list generator for frameless cabinet boxes.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
