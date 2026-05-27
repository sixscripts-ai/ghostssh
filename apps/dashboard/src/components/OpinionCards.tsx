"use client";
import React, { useState } from "react";
import type { OpinionPick } from "@/types/api";
import { useToast } from "./Toast";

type Props = {
  opinions: OpinionPick[];
  githubUsername?: string;
  linkedinText?: string;
};

export default function OpinionCards({ opinions, githubUsername, linkedinText }: Props) {
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleDraftEmail = async (company: string) => {
    setLoadingMsg("Generating cold email draft...");
    try {
      // The API endpoint is currently stubbed/disabled or missing, we just show a toast for now
      // Alternatively we can try calling it, and if it fails, show error.
      const res = await fetch("/api/jobs/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: githubUsername || "anonymous",
          company,
          profileSummary: linkedinText || "Experienced developer"
        })
      });
      if (res.ok) {
        showToast("Draft saved!", "success");
      } else {
        showToast("Failed to create draft", "error");
      }
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setLoadingMsg(null);
    }
  };

  const handleSaveToBoard = async (company: string, role: string) => {
    setLoadingMsg("Saving to board...");
    try {
      const res = await fetch(`/api/jobs/applications/temp-${Date.now()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "interviewing",
          company,
          role,
          userId: githubUsername || "anonymous"
        })
      });
      if (res.ok) {
        showToast("Saved to tracking board!", "success");
      } else {
        showToast("Failed to save to board", "error");
      }
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setLoadingMsg(null);
    }
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "var(--space-md)",
    marginBottom: "var(--space-xl)",
    marginTop: "var(--space-md)"
  };

  const TYPES = {
    apply_today: { label: "🎯 Apply Today", color: "#10b981" },
    watch_this: { label: "👀 Watch This", color: "#3b82f6" },
    cold_outreach: { label: "📬 Cold Outreach", color: "#8b5cf6" }
  };

  return (
    <div>
      <h2 style={{ marginBottom: "var(--space-md)", marginTop: "var(--space-xl)" }}>Opinion Engine Picks</h2>
      {loadingMsg && <p style={{ color: "var(--accent-primary)", marginBottom: "var(--space-sm)" }}>{loadingMsg}</p>}
      <div style={gridStyle}>
        {opinions.map((op, i) => {
          const config = TYPES[op.type] || { label: "Pick", color: "var(--text-primary)" };
          const cardStyle: React.CSSProperties = {
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            borderTop: `4px solid ${config.color}`,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)"
          };

          return (
            <div key={i} style={cardStyle} className="glass card-animate">
              <div style={{ fontWeight: 600, color: config.color }}>{config.label}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{op.company}</h3>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{op.role}</div>
              </div>
              
              <div style={{
                display: "inline-block", 
                backgroundColor: "var(--bg-tertiary)", 
                padding: "2px 8px", 
                borderRadius: "var(--radius-sm)",
                alignSelf: "flex-start",
                fontSize: "0.85rem",
                fontWeight: 500
              }}>
                Match Score: {op.score}
              </div>

              <p style={{ margin: "var(--space-sm) 0", fontSize: "0.9rem", lineHeight: 1.5 }}>
                {op.rationale}
              </p>

              {op.recruiterNote && (
                <div style={{ 
                  padding: "var(--space-sm)", 
                  backgroundColor: "rgba(139, 92, 246, 0.1)", 
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  borderLeft: "2px solid #8b5cf6"
                }}>
                  <strong>Note:</strong> {op.recruiterNote}
                </div>
              )}

              {op.bestTimeToApply && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  ⏳ Best time: {op.bestTimeToApply}
                </div>
              )}

              <div style={{ marginTop: "auto", paddingTop: "var(--space-md)" }}>
                {op.type === "apply_today" && op.url && (
                  <button 
                    onClick={() => window.open(op.url, "_blank")}
                    className="btn btn-primary"
                    style={{ width: "100%", backgroundColor: config.color, color: "#fff", border: "none" }}>
                    Apply Now &rarr;
                  </button>
                )}
                {op.type === "cold_outreach" && (
                  <button 
                    onClick={() => { showToast("Coming soon!", "info"); }}
                    className="btn btn-secondary"
                    style={{ width: "100%", border: `1px solid ${config.color}`, color: config.color }}>
                    Draft Email &rarr;
                  </button>
                )}
                {op.type === "watch_this" && (
                  <button 
                    onClick={() => handleSaveToBoard(op.company, op.role)}
                    className="btn btn-secondary"
                    style={{ width: "100%", border: `1px solid ${config.color}`, color: config.color }}>
                    Save to Board &rarr;
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
