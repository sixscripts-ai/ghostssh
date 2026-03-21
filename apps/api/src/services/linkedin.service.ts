export class LinkedInService {
  normalize(raw?: string): string { return raw ? raw.replace(/\r/g,"").replace(/\n{3,}/g,"\n\n").trim() : ""; }
}
