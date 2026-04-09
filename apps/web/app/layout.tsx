import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Search Engine",
  description: "A mini Elasticsearch-style search engine with custom indexing, full-text search, and ranking."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <span className="brand-mark">Search Engine</span>
              <span className="brand-copy">Indexing, full-text search, and ranking built from scratch.</span>
            </div>
            <nav className="nav">
              <Link href="/">Search</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </header>
        </div>
        {children}
      </body>
    </html>
  );
}
