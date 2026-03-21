"use client";

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

          <div className="detail-actions">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Apply →
            </a>
            <button
              className="btn-secondary"
              onClick={() => window.open(job.url, "_blank")}
            >
              View Posting
            </button>
          </div>

          {kit && <KitViewer kit={kit} />}
        </div>
      </div>
    </>
  );
}
