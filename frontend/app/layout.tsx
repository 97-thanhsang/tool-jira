import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Jira Power UI',
  description: 'Faster Jira interface for developers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. Material Design Lite) inject
    // attributes like className="mdl-js" into <html> before React hydrates — this is
    // harmless but triggers a false-positive hydration warning. Suppressing at root only.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script: apply dark mode class BEFORE page renders to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
