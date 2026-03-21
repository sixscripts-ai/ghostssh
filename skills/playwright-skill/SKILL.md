---
name: playwright-skill
description: >
  Use this skill for ANY browser automation task — testing web pages, filling forms,
  taking screenshots, automating job applications, scraping dynamic content, or
  verifying UI behavior. Trigger when user mentions: Playwright, browser automation,
  form filling, web testing, auto-apply, screenshot, headless browser, or any
  task that requires controlling a real browser. In ghostssh, this powers the
  Applier agent — automatically filling and submitting job application forms.
---

# Playwright Browser Automation Skill

Claude writes and executes custom Playwright automation on-the-fly for any browser task.

## Core Setup

Always start with this executor pattern — it handles module resolution correctly:

```javascript
// run.js — universal executor (always use this, never run scripts directly)
import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: false,  // visible by default so user can see what's happening
  slowMo: 100       // slight delay for visibility
});
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
});
const page = await context.newPage();

try {
  // --- YOUR AUTOMATION CODE HERE ---
} finally {
  await browser.close();
}
```

## ghostssh — Job Application Automation

For the Applier agent in ghostssh, use this pattern:

```javascript
async function applyToJob(jobUrl, profile, coverLetter) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Step 1: Verify it's actually a job listing
  await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 15000 });
  const screenshot = await page.screenshot({ path: '/tmp/job-verify.png' });
  // Send screenshot to Claude Vision to verify active listing
  
  // Step 2: Human-like form filling
  const fillField = async (selector, value) => {
    await page.click(selector);
    await page.waitForTimeout(Math.random() * 500 + 300); // 300-800ms delay
    await page.fill(selector, ''); // clear first
    await page.type(selector, value, { delay: Math.random() * 50 + 30 }); // human typing speed
  };
  
  // Step 3: Detect and fill common fields
  const fieldMap = {
    name: ['[name*="name"]', '[placeholder*="name"]', '[aria-label*="name"]'],
    email: ['[name*="email"]', '[type="email"]', '[placeholder*="email"]'],
    phone: ['[name*="phone"]', '[type="tel"]', '[placeholder*="phone"]'],
    linkedin: ['[name*="linkedin"]', '[placeholder*="linkedin"]'],
    coverLetter: ['textarea[name*="cover"]', 'textarea[placeholder*="cover"]', '#cover_letter']
  };
  
  for (const [field, selectors] of Object.entries(fieldMap)) {
    for (const selector of selectors) {
      if (await page.$(selector)) {
        await fillField(selector, profile[field] || '');
        break;
      }
    }
  }
  
  // Step 4: Screenshot proof before submit
  await page.screenshot({ path: `/tmp/before-submit-${Date.now()}.png` });
  
  // Step 5: Submit (never auto-submit without user approval flag)
  // Only submit if autoApply === true in user settings
  
  await browser.close();
  return { success: true, screenshot: `/tmp/before-submit-${Date.now()}.png` };
}
```

## Anti-Bot Evasion (for the Applier agent)

```javascript
// Randomize viewport
await context.setViewportSize({
  width: Math.floor(Math.random() * (1920 - 1280) + 1280),
  height: Math.floor(Math.random() * (1080 - 800) + 800)
});

// Natural mouse movement before clicking
await page.mouse.move(
  Math.random() * 100, Math.random() * 100,
  { steps: 10 }
);
await page.waitForTimeout(Math.random() * 1000 + 500);
await page.click(selector);

// Rotate user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
];
```

## Screenshot + Vision Verification

```javascript
// Take screenshot and verify with Claude Vision
const screenshotBuffer = await page.screenshot({ fullPage: true });
const base64 = screenshotBuffer.toString('base64');

// Pass to Anthropic Vision API to verify:
// "Is this an active job listing? Is an apply button visible? Any salary info?"
```

## Safe Cleanup

```javascript
// Always clean up temp files
import { unlink } from 'fs/promises';
import { glob } from 'glob';

const tmpFiles = await glob('/tmp/playwright-*.png');
await Promise.allSettled(tmpFiles.map(f => unlink(f)));
```

## Default Config

- headless: false (visible browser)
- slowMo: 100ms
- timeout: 30s per action
- screenshots: saved to /tmp/
- Max 3 form submissions per session
- Always screenshot before submit
