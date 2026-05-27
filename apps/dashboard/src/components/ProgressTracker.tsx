"use client";
import React, { useEffect, useState } from "react";

export default function ProgressTracker() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Fake progress simulation for the UX since the backend doesn't stream progress yet
    const timers = [
      setTimeout(() => setStage(1), 2000), // Profile built
      setTimeout(() => setStage(2), 5000), // Jobs fetched
      setTimeout(() => setStage(3), 12000), // Ranking complete
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stages = [
    "Extracting Profile",
    "Fetching Jobs",
    "Ranking via LLM",
    "Generating Opinions"
  ];

  return (
    <div style={{
      padding: "var(--space-xl)",
      backgroundColor: "var(--bg-secondary)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-light)",
      marginBottom: "var(--space-xl)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-md)"
    }} className="glass animate-fade-in">
      
      <div style={{ fontSize: "2rem", marginBottom: "var(--space-sm)" }}>
        <span className="loading-ghost" style={{ display: "inline-block", animation: "pulse 2s infinite" }}>👻</span>
      </div>
      
      <div style={{ fontWeight: 600, fontSize: "1.2rem", color: "var(--accent-primary)" }}>
        Agent is hunting for jobs...
      </div>
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
        width: "100%",
        maxWidth: "400px",
        marginTop: "var(--space-md)"
      }}>
        {stages.map((s, i) => {
          const isActive = i === stage;
          const isDone = i < stage;
          
          return (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
              opacity: isDone ? 1 : (isActive ? 1 : 0.4),
              transition: "all var(--transition-smooth)"
            }}>
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "var(--radius-full)",
                backgroundColor: isDone ? "#10b981" : (isActive ? "var(--accent-primary)" : "var(--bg-elevated)"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: (isDone || isActive) ? "#000" : "var(--text-secondary)",
                fontWeight: "bold",
                boxShadow: isActive ? "0 0 10px rgba(0, 229, 255, 0.5)" : "none"
              }}>
                {isDone ? "✓" : (i + 1)}
              </div>
              <span style={{ 
                color: isDone ? "var(--text-primary)" : (isActive ? "var(--accent-primary)" : "var(--text-secondary)"),
                fontWeight: isActive ? 600 : 400
              }}>
                {s}
              </span>
              {isActive && (
                <span style={{ 
                  marginLeft: "auto", 
                  width: "12px", 
                  height: "12px", 
                  border: "2px solid var(--accent-primary)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
              )}
            </div>
          );
        })}
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
