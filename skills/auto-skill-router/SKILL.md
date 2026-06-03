---
name: auto-skill-router
description: Meta-skill that automatically detects and invokes all relevant skills for any task. Reads the skills index, scores each skill against the current prompt, and calls the top matches via the Skill tool. Use this skill to ensure no relevant skill is ever missed. Also installs a UserPromptSubmit hook that injects skill suggestions into every session automatically.
---

# Auto Skill Router

Automatically detects and invokes all relevant skills for the current task. Ensures no skill is missed.

## How It Works

1. A `UserPromptSubmit` hook runs `skills-router.js` on every prompt
2. The hook scores **all** installed skills (active + archived) against the prompt using keyword matching
3. Top matches appear in the system-reminder as `[SKILLS ROUTER]`
4. Active skills → Claude calls via `Skill` tool; archived skills → Claude reads file and applies directly

## MANDATORY Rules (for Claude)

When `[SKILLS ROUTER]` appears in system-reminder:

1. **STOP** — do not start the task yet
2. For skills listed under "call via Skill tool" → call `Skill` tool for each, in order
3. For skills listed under "read + apply from skills-archive" → read `~/.claude/skills-archive/<name>/SKILL.md` and apply
4. **THEN** start the actual work

When no `[SKILLS ROUTER]` hint is present, still apply these always-on skills:
- Before writing/changing code → `karpathy-guidelines`
- After writing/changing code → `code-review`
- Before saying "done" / before commit / before PR → `verification-before-completion`
- Any bug / unexplained error → `systematic-debugging`
- Auth / secrets / payments touched → `security-review`
- New feature → `tdd-workflow`
- Creating a PR → `pr` + `pr-name`

## Installation

```bash
# 1. Copy hook script
cp hooks/skills-router.js ~/.claude/hooks/skills-router.js

# 2. Build skills index (run whenever you add new skills)
node hooks/build-index.js

# 3. Add hook to ~/.claude/settings.json UserPromptSubmit:
```

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

```bash
# 4. Add to ~/.claude/CLAUDE.md:
```

```markdown
## Skills — MANDATORY

Every prompt is analyzed by skills-router.js hook.
When [SKILLS ROUTER] appears in system-reminder → call ALL listed skills via Skill tool BEFORE starting work.
No exceptions. No skipping. No "I already know this skill".
```

## Skill Scoring Algorithm

Each skill is scored against the prompt:
- **+2 points** per exact token match (name or description)
- **+1 point** per partial substring match
- Stopwords filtered (common verbs, articles, prepositions)
- Top 6 skills by score are suggested

## Rebuilding the Index

```bash
node hooks/build-index.js
```

Run after installing new skills. Index saved to `~/.claude/skills-index.json`.
