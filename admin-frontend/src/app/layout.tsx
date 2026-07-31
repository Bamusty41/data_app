import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'Admin Dashboard – Nigerian Data & Airtime VTU Platform',
  description: 'Administrative UI for managing pricing, transactions, and users.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-gray-800">
      <body className="flex flex-col min-h-screen text-white">
        <NavBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
        <footer className="p-4 text-center text-sm opacity-70">
          © {new Date().getFullYear()} Data App Admin
        </footer>
      </body>
    </html>
  );
}
