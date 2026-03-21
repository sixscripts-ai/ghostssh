---
name: varlock
description: >
  ALWAYS apply this skill before committing code, writing logs, displaying output,
  or responding with any content that might include environment variables, API keys,
  tokens, passwords, or credentials. In ghostssh, trigger on any mention of:
  .env, API key, token, secret, MINIMAX_API_KEY, APPWRITE_API_KEY, MEM0_API_KEY,
  ANTHROPIC_API_KEY, or any sk-* / m0-* patterns. This project has had 8+ key
  leaks in a single session — this skill is mandatory.
---

# Varlock — Secret Protection for ghostssh

## The Problem
ghostssh has leaked the following keys in chat this session:
- GitHub token (ghp_xxr...)
- Minimax API key (sk-api-QJbn...)
- Appwrite API key (standard_1791...)
- Anthropic API key (sk-ant-api03-dab...)
- Mem0 API key (m0-l8OP...)
- OAuth token

Every single one of these must be rotated. This skill prevents it happening again.

## Hard Rules — Never Violate

### 1. NEVER output a real key in any response, log, or file
```
❌ MINIMAX_API_KEY=sk-api-QJbnPWvLG...
✅ MINIMAX_API_KEY=<your-minimax-key>
✅ MINIMAX_API_KEY=  (empty, user fills in)
```

### 2. NEVER log env var values
```typescript
// ❌
console.log(process.env.MINIMAX_API_KEY);
app.log.info({ key: env.APPWRITE_API_KEY });

// ✅ 
console.log('MINIMAX_API_KEY:', env.MINIMAX_API_KEY ? '✓ set' : '✗ missing');
```

### 3. ALWAYS check .gitignore before committing
These MUST be in .gitignore:
```
apps/api/.env
apps/dashboard/.env.local
apps/dashboard/.env
*.env.local
.env
```

### 4. Key pattern detection — flag immediately
If you see ANY of these patterns in code, logs, or output — STOP and redact:
- `sk-ant-api03-*` → Anthropic key
- `sk-api-*` → Minimax key  
- `m0-*` → Mem0 key
- `ghp_*` → GitHub token
- `standard_*` (64+ chars) → Appwrite key
- `eyJ*` → JWT token

### 5. .env.example format — always empty values
```bash
# ✅ Correct .env.example
MINIMAX_API_KEY=
APPWRITE_API_KEY=

# ❌ Never put real keys in .env.example
MINIMAX_API_KEY=sk-api-realkey123
```

## Rotation Checklist (for this project)
Run this after every session where a key was exposed:
- [ ] github.com/settings/tokens → revoke + regenerate
- [ ] platform.minimaxi.com → regenerate API key
- [ ] console.appwrite.io → regenerate API key
- [ ] app.mem0.ai/dashboard/api-keys → regenerate
- [ ] console.anthropic.com/settings/keys → revoke + create new

## Pre-commit Check
Before any `git commit`, scan for secrets:
```bash
# Quick scan
grep -r "sk-ant\|sk-api\|m0-\|ghp_\|standard_" apps/ --include="*.ts" --include="*.js" --include="*.env*"

# If anything found — DO NOT COMMIT
```
