# ghostssh

AI-powered job-hunting agent — multi-provider LLM support, automated job ranking, cover letter generation.

Built on [Superpowers](https://github.com/obra/superpowers).

## Quick Start

```bash
cd apps/api && cp .env.example .env
npm install && npm run dev
```

POST to `http://localhost:8080/jobs/search`:
```json
{
  "githubUsername": "your-github",
  "linkedinText": "...",
  "provider": "minimax",
  "topK": 10
}
```

## Providers

| Provider   | Env Key              | Default Model       |
|------------|----------------------|---------------------|
| Minimax    | MINIMAX_API_KEY      | MiniMax-M2.5        |
| OpenAI     | OPENAI_API_KEY       | gpt-4o              |
| Anthropic  | ANTHROPIC_API_KEY    | claude-sonnet-4-5   |
| Gemini     | GEMINI_API_KEY       | gemini-2.5-pro      |
| OpenRouter | OPENROUTER_API_KEY   | openai/gpt-4o       |

## Roadmap
- [ ] Playwright auto-apply worker
- [ ] Postgres + pgvector persistence
- [ ] LinkedIn export parser
- [ ] Dashboard UI
