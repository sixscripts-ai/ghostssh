import { getJson } from "../../lib/http.js";
import type { JobPosting } from "../../types/job.js";
type RA={jobs:Array<{id:number;company_name:string;title:string;candidate_required_location:string;url:string;description:string;job_type:string;tags:string[]}>};
export class RemotiveSource {
  async fetch(): Promise<JobPosting[]> {
    const d=await getJson<RA>("https://remotive.com/api/remote-jobs?category=software-dev");
    return d.jobs.map<JobPosting>(j=>({id:`rm-${j.id}`,source:"remotive",company:j.company_name,title:j.title,location:j.candidate_required_location||"Remote",remote:true,url:j.url,description:j.description.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(),employmentType:j.job_type,tags:j.tags}));
  }
}
