// Mirrors the Fastify API response types from apps/api/src/types/

export type JobSource = "greenhouse" | "lever" | "remotive";

export type JobPosting = {
  id: string;
  source: JobSource;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  employmentType?: string;
  tags: string[];
};

export type RankedJob = JobPosting & {
  score: number;
  rationale: string;
  missingRequirements: string[];
  matchingSkills: string[];
};

export type ApplicationKit = {
  title: string;
  company: string;
  url: string;
  fitSummary: string;
  recruiterPitch: string;
  coverLetter: string;
};

export type ProfileSkill = {
  name: string;
  confidence: number;
  source: "github" | "linkedin" | "manual";
};

export type GitHubRepoSummary = {
  name: string;
  description?: string;
  language?: string;
  topics: string[];
  stars: number;
  url: string;
};

export type CandidateProfile = {
  githubUsername?: string;
  linkedinText?: string;
  targetLocations: string[];
  targetTitles: string[];
  yearsExperience?: number;
  skills: ProfileSkill[];
  summary: string;
  repos: GitHubRepoSummary[];
  highlights: string[];
};

export type ProviderName = "minimax" | "openai" | "anthropic" | "gemini" | "openrouter";

export type SearchRequest = {
  githubUsername?: string;
  linkedinText?: string;
  manualTargetTitles?: string[];
  manualLocations?: string[];
  provider?: ProviderName;
  topK?: number;
};

export type SearchResponse = {
  profile: CandidateProfile;
  jobs: RankedJob[];
  kits: ApplicationKit[];
  providerUsed?: ProviderName;
};
