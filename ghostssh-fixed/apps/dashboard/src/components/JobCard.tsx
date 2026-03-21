import type { RankedJob } from "@/types/api";
import ScoreBadge from "./ScoreBadge";
import SkillTag from "./SkillTag";

interface JobCardProps {
  job: RankedJob;
  onClick: () => void;
  index: number;
}

export default function JobCard({ job, onClick, index }: JobCardProps) {
  return (
    <div
      className="job-card glass-card card-animate"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <span className="job-card-source">{job.source}</span>

      <div className="job-card-header">
        <div>
          <div className="job-card-company">{job.company}</div>
          <div className="job-card-title">{job.title}</div>
        </div>
        <ScoreBadge score={job.score} />
      </div>

      <div className="job-card-meta">
        <span className="job-card-meta-item">📍 {job.location}</span>
        {job.remote && <span className="job-card-meta-item">🌐 Remote</span>}
        {job.employmentType && (
          <span className="job-card-meta-item">💼 {job.employmentType}</span>
        )}
      </div>

      <div className="job-card-skills">
        {job.matchingSkills.slice(0, 4).map((s) => (
          <SkillTag key={s} name={s} variant="match" />
        ))}
        {job.missingRequirements.length > 0 && (
          <SkillTag
            name={`+${job.missingRequirements.length} gaps`}
            variant="missing"
          />
        )}
      </div>
    </div>
  );
}
