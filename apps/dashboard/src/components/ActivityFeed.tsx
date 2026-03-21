"use client";

import React, { useEffect, useState } from "react";
import type { RankedJob } from "@/types/api";

type HistoryData = {
  profile: any;
  jobs: RankedJob[];
  applications: any[];
};

type ActivityItem = {
  id: string;
  type: "jobs" | "application" | "memory" | "outreach";
  message: React.ReactNode;
  timestamp: string;
};

type Props = {
  githubUsername: string;
};

export default function ActivityFeed({ githubUsername }: Props) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/jobs/history?githubUsername=${encodeURIComponent(githubUsername)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [githubUsername]);

  const getTimeAgo = (dateStr: string) => {
    const r = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (r < 1) return 'Just now';
    if (r < 60) return `${r}m ago`;
    const h = Math.floor(r / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const getFeedItems = (): ActivityItem[] => {
    if (!data) return [];
    const items: ActivityItem[] = [];

    // Synthesize items from jobs and applications
    if (data.jobs && data.jobs.length > 0) {
      items.push({
        id: "jobs-" + Date.now(),
        type: "jobs",
        message: <>🔍 Found {data.jobs.length} jobs</>,
        timestamp: new Date().toISOString() // Or use oldest job date if we had one
      });
    }

    if (data.applications) {
      data.applications.forEach(app => {
        items.push({
          id: app.$id,
          type: "application",
          message: <>✅ Applied to {app.company || "a company"}</>,
          timestamp: app.$createdAt || new Date().toISOString()
        });
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
  };

  if (!githubUsername) return null;

  return (
    <div style={{
      backgroundColor: "var(--bg-secondary)",
      padding: "var(--space-md)",
      borderRadius: "var(--radius-md)",
      marginBottom: "var(--space-xl)",
      marginTop: "var(--space-md)"
    }}>
      <h3 style={{ margin: "0 0 var(--space-md) 0", fontSize: "1rem" }}>Activity Feed</h3>
      
      {loading && !data && (
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading activity...</div>
      )}
      
      {!loading && getFeedItems().length === 0 && (
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          No activity yet — run your first search
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {getFeedItems().map(item => (
          <div key={item.id} style={{ 
            fontSize: "0.9rem", 
            display: "flex", 
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{item.message}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              {getTimeAgo(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
