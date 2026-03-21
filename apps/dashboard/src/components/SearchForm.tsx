"use client";

import { useState } from "react";
import type { SearchRequest, ProviderName } from "@/types/api";
import { ProfileUploader } from "./ProfileUploader";

const PROVIDERS: { value: ProviderName; label: string }[] = [
  { value: "minimax", label: "Minimax M2.5" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "openai", label: "OpenAI GPT-4o" },
  { value: "gemini", label: "Google Gemini" },
  { value: "openrouter", label: "OpenRouter" },
];

interface SearchFormProps {
  onSubmit: (data: SearchRequest) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const [githubUsername, setGithubUsername] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [titles, setTitles] = useState("AI Engineer, ML Engineer");
  const [locations, setLocations] = useState("Remote");
  const [provider, setProvider] = useState<ProviderName>("minimax");
  const [topK, setTopK] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      githubUsername: githubUsername || undefined,
      linkedinText: linkedinText || undefined,
      manualTargetTitles: titles
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      manualLocations: locations
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      provider,
      topK,
    });
  };

  return (
    <form className="search-form glass-card" onSubmit={handleSubmit}>
      <h2>🔍 Job Search Agent</h2>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="github">
            GitHub Username
          </label>
          <input
            id="github"
            className="form-input"
            type="text"
            placeholder="e.g. sixscripts"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="titles">
            Target Titles
          </label>
          <input
            id="titles"
            className="form-input"
            type="text"
            placeholder="AI Engineer, ML Engineer"
            value={titles}
            onChange={(e) => setTitles(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="locations">
            Locations
          </label>
          <input
            id="locations"
            className="form-input"
            type="text"
            placeholder="Remote, San Francisco"
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
          />
        </div>

        <div className="form-group">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="provider">
                LLM Provider
              </label>
              <select
                id="provider"
                className="form-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderName)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="topk">
                Top K
              </label>
              <input
                id="topk"
                className="form-input"
                type="number"
                min={1}
                max={25}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="form-group full-width">
          <ProfileUploader onUploadComplete={(text) => setLinkedinText(text)} />
          <label className="form-label" htmlFor="linkedin">
            Or Paste LinkedIn Profile Text Manually
          </label>
          <textarea
            id="linkedin"
            className="form-textarea"
            placeholder="Paste your LinkedIn profile summary here..."
            value={linkedinText}
            onChange={(e) => setLinkedinText(e.target.value)}
            rows={6}
          />
        </div>

        <button
          type="submit"
          className="search-btn"
          disabled={isLoading || (!githubUsername && !linkedinText)}
        >
          {isLoading ? (
            <>⏳ Hunting...</>
          ) : (
            <>🔮 Hunt Jobs</>
          )}
        </button>
      </div>
    </form>
  );
}
