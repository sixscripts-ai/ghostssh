"use client";

import { useState } from "react";
import { Plus, Trash2, Globe } from "lucide-react";

interface UrlScraperProps {
  onScrapeComplete: (text: string) => void;
}

export function UrlScraper({ onScrapeComplete }: UrlScraperProps) {
  const [urls, setUrls] = useState<string[]>([""]);
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUrl = () => {
    if (urls.length < 5) setUrls([...urls, ""]);
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleChangeUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleScrape = async () => {
    const validUrls = urls.filter(u => u.trim() !== "");
    if (validUrls.length === 0) return;

    setIsScraping(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: validUrls }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape URLs');
      }

      onScrapeComplete(data.text);
      setUrls([""]); // Reset after success
    } catch (err: any) {
      console.error("Scrape error:", err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="url-scraper-container" style={{ padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "20px" }}>
      <h3 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem", color: "#E2E8F0", fontWeight: 600 }}>
        <Globe size={18} color="#60A5FA" /> Add Profile URLs (GitHub, LinkedIn, Personal Site)
      </h3>
      
      {urls.map((url, index) => (
        <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          <input
            className="form-input"
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => handleChangeUrl(index, e.target.value)}
            disabled={isScraping}
            style={{ flex: 1, margin: 0 }}
          />
          {urls.length > 1 && (
            <button 
              type="button" 
              onClick={() => handleRemoveUrl(index)}
              disabled={isScraping}
              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "0 14px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
              onMouseOut={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
        <button 
          type="button" 
          onClick={handleAddUrl} 
          disabled={isScraping || urls.length >= 5}
          style={{ background: "transparent", border: "none", color: "#60A5FA", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, opacity: urls.length >= 5 ? 0.5 : 1 }}
        >
          <Plus size={16} /> Add another URL
        </button>
        
        <button
          type="button"
          onClick={handleScrape}
          disabled={isScraping || urls.filter(u => u.trim() !== "").length === 0}
          className="search-btn"
          style={{ padding: "8px 20px", fontSize: "0.9rem", width: "auto", margin: 0 }}
        >
          {isScraping ? "⏳ Scraping & Process..." : "Extract Profiles"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: "16px", color: "#fca5a5", fontSize: "0.85rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "10px", borderRadius: "8px" }}>
          {error}
        </div>
      )}
    </div>
  );
}
