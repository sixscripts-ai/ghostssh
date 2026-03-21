"use client";

import { useEffect, useState } from "react";
import { Query } from "appwrite";
import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from "../lib/appwrite";

export type JobDocument = {
  $id: string;
  title: string;
  company: string;
  url: string;
  status: "saved" | "applied" | "interviewing" | "rejected";
  matchScore: number;
  location: string;
  rationale: string;
  $createdAt: string;
  $updatedAt: string;
};

const COLUMNS = [
  { id: "saved", label: "Saved for Later" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "rejected", label: "Rejected" },
];

export default function KanbanBoard() {
  const [jobs, setJobs] = useState<JobDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();

    // Subscribe to realtime updates
    const unsubscribe = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${JOBS_COLLECTION_ID}.documents`,
      (response) => {
        if (response.events.includes("databases.*.collections.*.documents.*.create")) {
          setJobs((prev) => [response.payload as JobDocument, ...prev]);
        }
        if (response.events.includes("databases.*.collections.*.documents.*.update")) {
          setJobs((prev) =>
            prev.map((job) =>
              job.$id === (response.payload as JobDocument).$id ? (response.payload as JobDocument) : job
            )
          );
        }
        if (response.events.includes("databases.*.collections.*.documents.*.delete")) {
          setJobs((prev) => prev.filter((job) => job.$id !== (response.payload as JobDocument).$id));
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, JOBS_COLLECTION_ID, [
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
      setJobs(response.documents as unknown as JobDocument[]);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedJobId(id);
    e.dataTransfer.effectAllowed = "move";
    // Slightly delay adding the dragging class so the drag image looks right
    setTimeout(() => {
      const el = document.getElementById(`job-${id}`);
      if (el) el.classList.add("dragging");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedJobId(null);
    const el = document.getElementById(`job-${id}`);
    if (el) el.classList.remove("dragging");
    
    document.querySelectorAll(".kanban-column").forEach((el) => {
      el.classList.remove("drag-over");
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    if (!draggedJobId) return;

    const job = jobs.find((j) => j.$id === draggedJobId);
    if (!job || job.status === newStatus) return;

    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.$id === draggedJobId ? { ...j, status: newStatus as any } : j))
    );

    try {
      await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, draggedJobId, {
        status: newStatus,
      });
    } catch (err) {
      console.error("Failed to update job status:", err);
      // Revert if failed (requires re-fetching or reverting)
      fetchJobs();
    }
    
    setDraggedJobId(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "high";
    if (score >= 60) return "mid";
    return "low";
  };

  if (isLoading) {
    return (
      <div className="loading-container" style={{ height: "60vh" }}>
        <div className="loading-ghost">👻</div>
        <div className="loading-text">Loading your job pipeline...</div>
      </div>
    );
  }

  return (
    <div className="kanban-board">
      {COLUMNS.map((column) => (
        <div
          key={column.id}
          className="kanban-column"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="kanban-column-header">
            <span className="kanban-column-title">{column.label}</span>
            <span className="kanban-column-count">
              {jobs.filter((j) => j.status === column.id).length}
            </span>
          </div>

          <div className="kanban-column-content">
            {jobs
              .filter((j) => j.status === column.id)
              .map((job) => (
                <div
                  key={job.$id}
                  id={`job-${job.$id}`}
                  className="kanban-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, job.$id)}
                  onDragEnd={(e) => handleDragEnd(e, job.$id)}
                  onClick={() => window.open(job.url, "_blank")}
                >
                  <div className="kanban-item-header">
                    <span className="kanban-item-company">{job.company}</span>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-link-icon" onClick={(e) => e.stopPropagation()}>
                      ↗
                    </a>
                  </div>
                  <div className="kanban-item-title">{job.title}</div>
                  
                  <div className="kanban-item-meta">
                    <span className="kanban-item-location">{job.location || 'Remote'}</span>
                    <span className={`kanban-item-score ${getScoreColor(job.matchScore)}`}>
                      {job.matchScore}% Match
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
