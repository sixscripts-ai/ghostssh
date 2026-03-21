export type ProfileSkill = { name: string; confidence: number; source: "github"|"linkedin"|"manual" };
export type GitHubRepoSummary = { name: string; description?: string; language?: string; topics: string[]; stars: number; url: string };
export type CandidateProfile = {
  githubUsername?: string; linkedinText?: string;
  targetLocations: string[]; targetTitles: string[];
  yearsExperience?: number; skills: ProfileSkill[];
  summary: string; repos: GitHubRepoSummary[]; highlights: string[];
};
