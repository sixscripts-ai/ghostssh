import { describe, it, expect } from 'vitest';
import { linkedInParserService } from '../linkedin-parser.service.js';
import AdmZip from 'adm-zip';

describe('LinkedInParserService', () => {
  it('should parse a valid LinkedIn zip export buffer', () => {
    // 1. Create a mock zip in memory
    const zip = new AdmZip();
    
    // Add Profile.csv
    zip.addFile('Profile.csv', Buffer.from('First Name,Last Name,Headline,Summary\nJohn,Doe,"Senior Engineer","I write code."\n', 'utf8'));
    
    // Add Skills.csv
    zip.addFile('Skills.csv', Buffer.from('Name\nJavaScript\nTypeScript\nReact\n', 'utf8'));
    
    // Add Positions.csv
    zip.addFile('Positions.csv', Buffer.from('Company Name,Title,Description,Started On,Finished On\nGoogle,Software Engineer,"Built things",2020-01-01,2023-01-01\n', 'utf8'));
    
    // Add Education.csv
    zip.addFile('Education.csv', Buffer.from('School Name,Degree Name,Field Of Study,Start Date,End Date\nMIT,B.S.,Computer Science,2015-09-01,2019-06-01\n', 'utf8'));
    
    const buffer = zip.toBuffer();
    
    // 2. Parse it
    const profile = linkedInParserService.parseZip(buffer);
    
    // 3. Assertions
    expect(profile.headline).toBe('Senior Engineer');
    expect(profile.summary).toBe('I write code.');
    
    expect(profile.skills).toEqual(['JavaScript', 'TypeScript', 'React']);
    
    expect(profile.positions).toHaveLength(1);
    expect(profile.positions![0]!.company).toBe('Google');
    expect(profile.positions![0]!.title).toBe('Software Engineer');
    expect(profile.positions![0]!.description).toBe('Built things');
    expect(profile.positions![0]!.dates).toBe('2020-01-01 - 2023-01-01');
    
    expect(profile.education).toHaveLength(1);
    expect(profile.education![0]!.school).toBe('MIT');
    expect(profile.education![0]!.degree).toBe('B.S.');
    expect(profile.education![0]!.field).toBe('Computer Science');
    expect(profile.education![0]!.dates).toBe('2015-09-01 - 2019-06-01');
  });

  it('should handle missing files gracefully', () => {
    const zip = new AdmZip();
    zip.addFile('Profile.csv', Buffer.from('First Name,Last Name,Headline,Summary\nJohn,Doe,"Only Headline",""\n', 'utf8'));
    
    const profile = linkedInParserService.parseZip(zip.toBuffer());
    
    expect(profile.headline).toBe('Only Headline');
    expect(profile.skills).toEqual([]);
    expect(profile.positions).toEqual([]);
    expect(profile.education).toEqual([]);
  });
});
