"use client";

import { useState, useCallback } from "react";
import type { SearchRequest, SearchResponse, RankedJob, ApplicationKit } from "@/types/api";
import SearchForm from "@/components/SearchForm";
import JobCard from "@/components/JobCard";
import JobDetail from "@/components/JobDetail";
import ProfileSummary from "@/components/ProfileSummary";
import OpinionCards from "@/components/OpinionCards";
import ActivityFeed from "@/components/ActivityFeed";
import ProgressTracker from "@/components/ProgressTracker";
import ErrorState from "@/components/ErrorState";

export default function HomePage() {
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<RankedJob | null>(null);
  const [selectedKit, setSelectedKit] = useState<ApplicationKit | undefined>(undefined);
  const [lastRequest, setLastRequest] = useState<SearchRequest | null>(null);

  const handleSearch = useCallback(async (data: SearchRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedJob(null);
    setSelectedKit(undefined);
    setLastRequest(data);

    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.details || err.error || `Request failed (${res.status})`
        );
      }

      const json: SearchResponse = await res.json();
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (lastRequest) handleSearch(lastRequest);
  }, [lastRequest, handleSearch]);

  const handleJobSelect = useCallback(async (job: RankedJob) => {
    setSelectedJob(job);
    setSelectedKit(undefined); // clear old kit
    if (!result?.profile) return;
    
    try {
      const res = await fetch("/api/jobs/kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job,
          profile: result.profile,
          provider: lastRequest?.provider,
          apiKey: lastRequest?.apiKey
        })
      });
      if (res.ok) {
        const kit = await res.json();
        setSelectedKit(kit);
      }
    } catch (e) {
      console.error("Failed to lazy load kit:", e);
    }
  }, [result, lastRequest]);

  return (
    <>
      <div className="pipeline-line"></div>
      <div style={{ marginTop: "var(--space-xl)", position: "relative", zIndex: 1 }}>
        <SearchForm onSubmit={handleSearch} isLoading={isLoading} />
      </div>

      {lastRequest?.githubUsername && (
        <ActivityFeed githubUsername={lastRequest.githubUsername} />
      )}

      {isLoading && <ProgressTracker />}

      {error && <ErrorState message={error} onRetry={handleRetry} />}

      {result && !isLoading && (
        <>
          <ProfileSummary profile={result.profile} />
          
          {result.opinions && result.opinions.length > 0 && (
            <OpinionCards
              opinions={result.opinions}
              githubUsername={lastRequest?.githubUsername}
              linkedinText={lastRequest?.linkedinText}
            />
          )}

          <div className="results-section">
            <div className="results-header">
              <h2>
                {result.jobs.length} Job{result.jobs.length !== 1 ? "s" : ""}{" "}
                Found
              </h2>
              <span className="results-count">
                Sorted by match score
                {result.providerUsed && ` · via ${result.providerUsed}`}
              </span>
            </div>

            <div className="job-grid">
              {result.jobs.map((job, i) => (
                <JobCard
                  key={job.id}
                  job={job}
                  index={i}
                  onClick={() => handleJobSelect(job)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {selectedJob && (
        <JobDetail
          job={selectedJob}
          kit={selectedKit}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </>
  );
}
