export type JobSource = "greenhouse"|"lever"|"remotive";
export type JobPosting = { id: string; source: JobSource; company: string; title: string; location: string; remote: boolean; url: string; description: string; employmentType?: string; tags: string[] };
export type RankedJob = JobPosting & { score: number; rationale: string; missingRequirements: string[]; matchingSkills: string[] };
export type ApplicationKit = { title: string; company: string; url: string; fitSummary: string; recruiterPitch: string; coverLetter: string };
