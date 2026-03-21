import { env } from "../config/env.js";
import { getJson } from "../lib/http.js";
import type { GitHubRepoSummary } from "../types/profile.js";

type GHRepo = { name:string; description:string|null; language:string|null; topics?:string[]; stargazers_count:number; html_url:string; fork:boolean };

export class GitHubService {
  async getRepos(username: string): Promise<GitHubRepoSummary[]> {
    const repos = await getJson<GHRepo[]>(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers: { Accept:"application/vnd.github+json", Authorization: env.GITHUB_TOKEN?`Bearer ${env.GITHUB_TOKEN}`:"", "User-Agent":env.USER_AGENT } }
    );
    return repos.filter(r=>!r.fork).sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,25)
      .map(r=>({ name:r.name, description:r.description??undefined, language:r.language??undefined, topics:r.topics??[], stars:r.stargazers_count, url:r.html_url }));
  }
}
