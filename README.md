# auto-skill-router

**Automatically detect and invoke all relevant Claude Code skills for every task.**

Never miss a skill again. A `UserPromptSubmit` hook scores every prompt against your installed skills index and injects the top matches into the system-reminder — Claude then calls each one before starting work.

## How It Works

```
User prompt → skills-router.js → keyword scoring → [SKILLS ROUTER] in system-reminder → Claude calls skills → work begins
```

1. Hook runs on every prompt (UserPromptSubmit)
2. Scores **all** installed skills (active + archived, 1400+) via keyword matching against the prompt
3. Top 6 matches injected as `[SKILLS ROUTER]` system-reminder
4. Active skills → Claude calls via `Skill` tool; archived → Claude reads file and applies directly

## Quick Install

```bash
# 1. Copy files
cp hooks/skills-router.js ~/.claude/hooks/skills-router.js
cp hooks/build-index.js ~/.claude/hooks/build-index.js
cp skills/auto-skill-router/SKILL.md ~/.claude/skills/auto-skill-router/SKILL.md

# 2. Build skills index
node ~/.claude/hooks/build-index.js

# 3. Add hook to ~/.claude/settings.json
```

Add to `~/.claude/settings.json` under `hooks.UserPromptSubmit`:

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "node \"/Users/YOU/.claude/hooks/skills-router.js\"",
      "timeout": 5000,
      "statusMessage": "Routing skills..."
    }
  ]
}
```

Replace `YOU` with your macOS username.

## Add to CLAUDE.md

```markdown
## Skills — MANDATORY

Every prompt is analyzed by skills-router.js hook.
When [SKILLS ROUTER] appears in system-reminder:
→ Call ALL listed skills via Skill tool BEFORE starting work.
No exceptions. No skipping.
```

## Scoring Algorithm

Each skill is scored against the tokenized prompt:
- **+2** per exact token match in skill name or description
- **+1** per partial substring match
- Common stopwords filtered out
- Minimum score of **2** required (reduces false positives)
- Top **6** skills surfaced

## Rebuild Index

Run after installing new skills:

```bash
node ~/.claude/hooks/build-index.js
```

Index saved to `~/.claude/skills-index.json`.

## Example Output

For prompt: *"fix this bug in auth middleware, tests are failing"*

```
[SKILLS ROUTER] Relevant skills for this task:
  • systematic-debugging (score: 8) — Use when encountering any bug, test failure…
  • tdd-workflow (score: 6) — Use this skill when writing new features, fixing bugs…
  • security-review (score: 4) — Security vulnerability detection for auth, secrets…
  • diagnose (score: 4) — Disciplined diagnosis loop for hard bugs…
  • tdd (score: 3) — Test-driven development with red-green-refactor loop…
MANDATORY: Call Skill tool for each BEFORE starting work: systematic-debugging, tdd-workflow, security-review, diagnose, tdd
```

## License

MIT
