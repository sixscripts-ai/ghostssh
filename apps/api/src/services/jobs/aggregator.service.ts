import type { JobPosting } from "../../types/job.js";
import { GreenhouseSource } from "./greenhouse.source.js";
import { LeverSource } from "./lever.source.js";
import { RemotiveSource } from "./remotive.source.js";
export class JobAggregatorService {
  private g=new GreenhouseSource(); private l=new LeverSource(); private r=new RemotiveSource();
  async fetchAll(): Promise<JobPosting[]> {
    const [a,b,c]=await Promise.all([this.g.fetch(),this.l.fetch(),this.r.fetch()]);
    const seen=new Set<string>(); return [...a,...b,...c].filter(j=>{ const k=`${j.company}|${j.title}`.toLowerCase(); return seen.has(k)?false:(seen.add(k),true); });
  }
}
