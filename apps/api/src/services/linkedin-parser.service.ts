import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';

export interface CandidateProfile {
  headline: string;
  summary: string;
  skills: string[];
  positions: Array<{ title: string; company: string; description: string; dates: string }>;
  education: Array<{ school: string; degree: string; field: string; dates: string }>;
}

export class LinkedInParserService {
  /**
   * Accepts a buffer of a ZIP file (LinkedIn Data Export), expands it in memory,
   * parses the necessary CSV files, and structures them into a CandidateProfile.
   * @param buffer Raw buffer of the `.zip` upload
   * @returns Structured CandidateProfile object
   */
  public parseZip(buffer: Buffer): CandidateProfile {
    // 1. Unzip the buffer in memory
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    let headline = '';
    let summary = '';
    const skills: string[] = [];
    const positions: any[] = [];
    const education: any[] = [];
    
    // 2. Iterate through files and extract matching CSVs
    zipEntries.forEach(zipEntry => {
      const fileName = zipEntry.entryName;
      
      try {
        if (fileName === 'Profile.csv') {
          const records = parse(zipEntry.getData().toString('utf8'), { columns: true, skip_empty_lines: true, bom: true });
          if (records.length > 0) {
            const first = records[0] as any;
            headline = first['Headline'] || first['Title'] || '';
            summary = first['Summary'] || first['About'] || '';
          }
        } 
        else if (fileName === 'Skills.csv') {
          const records = parse(zipEntry.getData().toString('utf8'), { columns: true, skip_empty_lines: true, bom: true });
          records.forEach((r: any) => {
            if (r.Name) skills.push(r.Name);
          });
        } 
        else if (fileName === 'Positions.csv') {
          const records = parse(zipEntry.getData().toString('utf8'), { columns: true, skip_empty_lines: true, bom: true });
          records.forEach((r: any) => {
            positions.push({
              title: r.Title || '',
              company: r['Company Name'] || '',
              description: r.Description || '',
              dates: `${r['Started On'] || ''} - ${r['Finished On'] || ''}`
            });
          });
        } 
        else if (fileName === 'Education.csv') {
          const records = parse(zipEntry.getData().toString('utf8'), { columns: true, skip_empty_lines: true, bom: true });
          records.forEach((r: any) => {
            education.push({
              school: r['School Name'] || '',
              degree: r['Degree Name'] || '',
              field: r['Field Of Study'] || '',
              dates: `${r['Start Date'] || ''} - ${r['End Date'] || ''}`
            });
          });
        }
      } catch (err) {
        console.warn(`Failed to parse ${fileName} from LinkedIn export`, err);
        // Continue processing other files
      }
    });
    
    return {
      headline,
      summary,
      skills,
      positions,
      education
    };
  }
}

export const linkedInParserService = new LinkedInParserService();
