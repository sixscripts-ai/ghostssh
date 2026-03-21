import type { Metadata } from "next";
import "./globals.css";

import Link from "next/link";

export const metadata: Metadata = {
  title: "ghostssh — AI Job Hunting Agent",
  description:
    "AI-powered job hunting agent that reads your GitHub & LinkedIn profile, fetches live AI/ML job listings, and generates personalized cover letters.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="container navbar-inner">
            <Link href="/" className="navbar-brand">
              <span className="navbar-brand-icon">👻</span>
              <span>ghostssh</span>
            </Link>
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <Link href="/board" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Kanban Board
              </Link>
              <span className="navbar-provider">AI Job Agent</span>
            </div>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
