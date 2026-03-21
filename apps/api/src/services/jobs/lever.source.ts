import { getJson } from "../../lib/http.js";
import type { JobPosting } from "../../types/job.js";
const BOARDS = [{ company:"Cohere",token:"cohere"},{company:"Mistral AI",token:"mistral"}];
type LJob={id:string;text:string;hostedUrl:string;categories:{location:string;commitment?:string};descriptionPlain:string};
export class LeverSource {
  async fetch(): Promise<JobPosting[]> {
    const all = await Promise.all(BOARDS.map(async b=>{
      try { const d=await getJson<LJob[]>(`https://api.lever.co/v0/postings/${b.token}?mode=json`); return d.map<JobPosting>(j=>({id:`lv-${b.token}-${j.id}`,source:"lever",company:b.company,title:j.text,location:j.categories.location||"Unknown",remote:/remote/i.test(j.categories.location||"")||/remote/i.test(j.descriptionPlain),url:j.hostedUrl,description:j.descriptionPlain,employmentType:j.categories.commitment,tags:["lever",b.company]})); }
      catch{return[];}
    }));
    return all.flat();
  }
}
