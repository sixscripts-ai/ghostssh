"use client";

import { useEffect } from "react";
import type { RankedJob, ApplicationKit } from "@/types/api";
import ScoreBadge from "./ScoreBadge";
import SkillTag from "./SkillTag";
import KitViewer from "./KitViewer";

interface JobDetailProps {
  job: RankedJob;
  kit?: ApplicationKit;
  onClose: () => void;
}

export default function JobDetail({ job, kit, onClose }: JobDetailProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-panel-inner">
          <button className="detail-close" onClick={onClose}>
            ✕
          </button>

          <div className="detail-score-row">
            <ScoreBadge score={job.score} />
            <div>
              <div className="detail-score-label">{job.score}/100</div>
              <div className="detail-score-sub">Match Score</div>
            </div>
          </div>

          <div className="detail-company">{job.company}</div>
          <div className="detail-title">{job.title}</div>

          <div className="job-card-meta">
            <span className="job-card-meta-item">📍 {job.location}</span>
            {job.remote && <span className="job-card-meta-item">🌐 Remote</span>}
            {job.employmentType && (
              <span className="job-card-meta-item">💼 {job.employmentType}</span>
            )}
            <span className="job-card-meta-item">📦 {job.source}</span>
          </div>

          <div className="detail-section">
            <h3>AI Rationale</h3>
            <p className="detail-rationale">{job.rationale}</p>
          </div>

          <div className="detail-section">
            <h3>Matching Skills</h3>
            <div className="detail-skills-list">
              {job.matchingSkills.map((s) => (
                <SkillTag key={s} name={s} variant="match" />
              ))}
            </div>
          </div>

          {job.missingRequirements.length > 0 && (
            <div className="detail-section">
              <h3>Gaps to Address</h3>
              <div className="detail-skills-list">
                {job.missingRequirements.map((s) => (
                  <SkillTag key={s} name={s} variant="missing" />
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions" style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Open Posting ↗
            </a>
            <button
              className="btn btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(job.url);
                // Can use toast if we import useToast, but for now just copy
              }}
            >
              Copy Link
            </button>
          </div>

          {kit && <KitViewer kit={kit} />}
        </div>
      </div>
    </>
  );
}
