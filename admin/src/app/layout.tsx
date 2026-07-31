import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Strowallet Admin Dashboard',
  description: 'Admin interface for Nigerian Data & Airtime VTU platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
