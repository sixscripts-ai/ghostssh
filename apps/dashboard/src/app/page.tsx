"use client";

import { useState, useCallback } from "react";
import type { SearchRequest, SearchResponse, RankedJob } from "@/types/api";
import SearchForm from "@/components/SearchForm";
import JobCard from "@/components/JobCard";
import JobDetail from "@/components/JobDetail";
import ProfileSummary from "@/components/ProfileSummary";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

export default function HomePage() {
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<RankedJob | null>(null);
  const [lastRequest, setLastRequest] = useState<SearchRequest | null>(null);

  const handleSearch = useCallback(async (data: SearchRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedJob(null);
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

  // Find the kit for the selected job
  const selectedKit =
    selectedJob && result
      ? result.kits.find(
          (k) =>
            k.company === selectedJob.company && k.title === selectedJob.title
        )
      : undefined;

  return (
    <>
      <div style={{ marginTop: "var(--space-xl)" }}>
        <SearchForm onSubmit={handleSearch} isLoading={isLoading} />
      </div>

      {isLoading && <LoadingState />}

      {error && <ErrorState message={error} onRetry={handleRetry} />}

      {result && !isLoading && (
        <>
          <ProfileSummary profile={result.profile} />

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
                  onClick={() => setSelectedJob(job)}
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
