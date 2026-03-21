"use client";

import { useState } from "react";
import type { CandidateProfile } from "@/types/api";
import SkillTag from "./SkillTag";

interface ProfileSummaryProps {
  profile: CandidateProfile;
}

type Tab = "skills" | "repos" | "highlights";

export default function ProfileSummary({ profile }: ProfileSummaryProps) {
  const [tab, setTab] = useState<Tab>("skills");

  return (
    <div className="profile-section">
      <div className="profile-card glass-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.githubUsername?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="profile-name">
              {profile.githubUsername ?? "Candidate"}
            </div>
            <div className="profile-sub">
              {profile.targetTitles.join(" · ")} · {profile.targetLocations.join(", ")}
            </div>
          </div>
        </div>

        <p className="profile-summary-text">{profile.summary}</p>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${tab === "skills" ? "active" : ""}`}
            onClick={() => setTab("skills")}
          >
            Skills ({profile.skills.length})
          </button>
          <button
            className={`profile-tab ${tab === "repos" ? "active" : ""}`}
            onClick={() => setTab("repos")}
          >
            Repos ({profile.repos.length})
          </button>
          <button
            className={`profile-tab ${tab === "highlights" ? "active" : ""}`}
            onClick={() => setTab("highlights")}
          >
            Highlights ({profile.highlights.length})
          </button>
        </div>

        {tab === "skills" && (
          <div className="profile-skills-grid">
            {profile.skills.map((s) => (
              <SkillTag
                key={s.name}
                name={`${s.name} (${Math.round(s.confidence * 100)}%)`}
                variant={s.confidence >= 0.7 ? "match" : "neutral"}
              />
            ))}
          </div>
        )}

        {tab === "repos" && (
          <div className="profile-repo-list">
            {profile.repos.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-repo-item"
              >
                <div>
                  <div className="profile-repo-name">{r.name}</div>
                  {r.description && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {r.description}
                    </div>
                  )}
                </div>
                <div className="profile-repo-meta">
                  {r.language && <span>{r.language}</span>}
                  <span>⭐ {r.stars}</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {tab === "highlights" && (
          <ul style={{ paddingLeft: "var(--space-lg)", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.8 }}>
            {profile.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
