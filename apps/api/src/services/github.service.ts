import { env } from "../config/env.js";
import { getJson } from "../lib/http.js";
import type { GitHubRepoSummary } from "../types/profile.js";

type GHRepo = { name:string; description:string|null; language:string|null; topics?:string[]; stargazers_count:number; html_url:string; fork:boolean };

export class GitHubService {
  private networkCache = new Map<string, string[]>();

  async getNetworkOverlap(username: string, company: string): Promise<string[]> {
    try {
      if (!username) return [];
      const cacheKey = `${username}:${company}`;
      if (this.networkCache.has(cacheKey)) return this.networkCache.get(cacheKey)!;

      const headers = { Accept: "application/vnd.github+json", Authorization: env.GITHUB_TOKEN ? `Bearer ${env.GITHUB_TOKEN}` : "", "User-Agent": env.USER_AGENT };
      const followers = await getJson<any[]>(`https://api.github.com/users/${encodeURIComponent(username)}/followers?per_page=100`, { headers }).catch(() => []);
      const following = await getJson<any[]>(`https://api.github.com/users/${encodeURIComponent(username)}/following?per_page=100`, { headers }).catch(() => []);
      
      const combined = [...followers, ...following];
      const uniqueLogins = Array.from(new Set(combined.map(u => u.login).filter(Boolean)));
      
      const matches: string[] = [];
      const companyLower = company.toLowerCase();

      // Parallelize to avoid taking ages, or maybe one by one limit? The instructions say "for each user, check if their bio or company field contains the company name"
      // Wait, 200 users one-by-one can take 200 seconds easily, let's chunk it. Or standard loop since instructions say so. Wait, GH rate limit! Limit 5.
      for (const login of uniqueLogins) {
        if (matches.length >= 5) break;

        const userDetail = await getJson<any>(`https://api.github.com/users/${encodeURIComponent(login)}`, { headers }).catch(() => null);
        if (!userDetail) continue;

        const bio = (userDetail.bio || "").toLowerCase();
        const comp = (userDetail.company || "").toLowerCase();
        if (bio.includes(companyLower) || comp.includes(companyLower)) {
          matches.push(login);
        }
      }

      this.networkCache.set(cacheKey, matches);
      return matches;
    } catch (e) {
      return [];
    }
  }

  async getRepos(username: string): Promise<GitHubRepoSummary[]> {
    const repos = await getJson<GHRepo[]>(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers: { Accept:"application/vnd.github+json", Authorization: env.GITHUB_TOKEN?`Bearer ${env.GITHUB_TOKEN}`:"", "User-Agent":env.USER_AGENT } }
    );
    return repos.filter(r=>!r.fork).sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,25)
      .map(r=>({ name:r.name, description:r.description??undefined, language:r.language??undefined, topics:r.topics??[], stars:r.stargazers_count, url:r.html_url }));
  }
}
