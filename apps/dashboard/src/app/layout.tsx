import type { Metadata } from "next";
import "./globals.css";

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
            <div className="navbar-brand">
              <span className="navbar-brand-icon">👻</span>
              <span>ghostssh</span>
            </div>
            <span className="navbar-provider">AI Job Agent</span>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
