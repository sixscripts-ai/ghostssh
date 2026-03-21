import { webSearchService } from './web-search.service.js'
import { jinaScraperService } from './jina-scraper.service.js'
import { withFallback } from '../providers/index.js'
import { databases, DATABASE_ID } from '../lib/appwrite.js'
import { ID } from 'node-appwrite'
import { emitAgentEvent } from '../lib/event-bus.js'

export type Contact = {
  name: string
  role: string
  email?: string
  linkedinUrl?: string
  confidence: number
}

export type OutreachDraft = {
  userId: string
  company: string
  contact: Contact
  subject1: string
  subject2: string
  subject3: string
  body: string
  status: 'draft'
  followUpDate: string
}

export class OutreachService {
  async findBestContact(company: string): Promise<Contact | null> {
    try {
      const queries = [
        `"${company}" "VP Engineering" OR "CTO" OR "Head of Engineering" linkedin`,
        `"${company}" engineering recruiter linkedin`,
        `"${company}" engineering manager linkedin`
      ]

      for (const query of queries) {
        const searchResults = await webSearchService.search(query, 3)
        const linkedinResult = searchResults.find(r => r.url.includes('linkedin.com/in/'))
        
        if (linkedinResult) {
          const scrapeResult = await jinaScraperService.scrapeWithResilience(linkedinResult.url)
          if (scrapeResult && scrapeResult.success) {
            const first500 = scrapeResult.content.substring(0, 500)
            let name = 'Engineering Contact'
            let role = 'Engineering Manager/Recruiter'
            
            const nameMatch = first500.match(/##\s+([^\n]+)/) || first500.match(/\*\*([^\*]+)\*\*/)
            if (nameMatch && nameMatch[1]) {
              // Might be title, but let's assume it's the name extracted
              name = nameMatch[1].trim()
            }

            return {
              name,
              role,
              linkedinUrl: linkedinResult.url,
              confidence: 70
            }
          }
        }
      }
      return null
    } catch (error) {
      return null
    }
  }

  async generateDraft(
    userId: string,
    company: string,
    contact: Contact,
    profileSummary: string
  ): Promise<OutreachDraft> {
    const prompt = `You write concise technical cold outreach emails for senior developers.
    Return strict JSON only:
    { "subject1": "string", "subject2": "string", "subject3": "string", "body": "string" }
    Rules: max 150 words in body, direct and technical, no fluff,
    reference specific skills from the profile, no em dashes,
    subject lines should be specific not generic`

    const userMessage = JSON.stringify({ company, contact, profileSummary })

    const rawResponse = await withFallback(llm => llm.generate({
      system: prompt,
      user: userMessage,
      json: true
    })) as string
    
    // Safety generic parsing for JSON returned within backticks
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const followUp = new Date()
    followUp.setDate(followUp.getDate() + 7)

    return {
      userId,
      company,
      contact,
      subject1: parsed.subject1,
      subject2: parsed.subject2,
      subject3: parsed.subject3,
      body: parsed.body,
      status: 'draft',
      followUpDate: followUp.toISOString().split('T')[0] as string
    }
  }

  async saveToAppwrite(draft: OutreachDraft): Promise<string> {
    try {
      const doc = await databases.createDocument(
        DATABASE_ID,
        'outreach_drafts',
        ID.unique(),
        draft
      )
      return doc.$id
    } catch (error) {
      return ""
    }
  }

  async createOutreachForJob(
    userId: string,
    company: string,
    profileSummary: string
  ): Promise<OutreachDraft | null> {
    const contact = await this.findBestContact(company)
    if (!contact) return null

    const draft = await this.generateDraft(userId, company, contact, profileSummary)
    await this.saveToAppwrite(draft)

    void emitAgentEvent({
      userId,
      agent: "outreach",
      action: "draft_created",
      status: "success",
      duration_ms: 0,
      timestamp: new Date().toISOString()
    })

    return draft
  }
}

export const outreachService = new OutreachService()
