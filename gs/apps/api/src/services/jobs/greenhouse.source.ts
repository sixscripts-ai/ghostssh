import { getJson } from "../../lib/http.js";
import type { JobPosting } from "../../types/job.js";

const BOARDS = [
  { company:"OpenAI", token:"openai" }, { company:"Anthropic", token:"anthropic" },
  { company:"Perplexity", token:"perplexityai" }, { company:"Scale AI", token:"scaleai" },
  { company:"Hugging Face", token:"huggingface" },
];

type GHJob = { id:number; title:string; absolute_url:string; location:{name:string}; content?:string; metadata?:Array<{name:string;value:string}> };

export class GreenhouseSource {
  async fetch(): Promise<JobPosting[]> {
    const all = await Promise.all(BOARDS.map(async b => {
      try {
        const d = await getJson<{jobs:GHJob[]}>(`https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs?content=true`);
        return d.jobs.map<JobPosting>(j=>({ id:`gh-${b.token}-${j.id}`, source:"greenhouse", company:b.company, title:j.title, location:j.location?.name??"Unknown", remote:/remote/i.test(j.location?.name??"")||/remote/i.test(j.content??""), url:j.absolute_url, description:strip(j.content??""), employmentType:j.metadata?.find(m=>/employment/i.test(m.name))?.value, tags:["greenhouse",b.company] }));
      } catch { return []; }
    }));
    return all.flat();
  }
}
function strip(s:string){return s.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();}
