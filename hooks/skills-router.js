#!/usr/bin/env node
// Skills router: reads user prompt, finds relevant skills, injects into system-reminder
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const INDEX_PATH = path.join(os.homedir(), ".claude", "skills-index.json");
const MAX_SKILLS = 6;

function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  } catch {
    return [];
  }
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Words too common to be useful for matching
const STOPWORDS = new Set([
  "use", "when", "this", "that", "with", "for", "and", "the", "or", "are",
  "is", "it", "in", "to", "of", "a", "an", "be", "by", "on", "at", "if",
  "as", "do", "we", "you", "can", "will", "have", "has", "had", "not",
  "from", "your", "also", "any", "all", "more", "new", "how", "what",
  "build", "create", "implement", "add", "get", "set", "run", "make",
  "user", "code", "data", "file", "app", "task", "help", "need", "want",
  "using", "building", "creating", "implementing", "writing", "adding",
]);

function score(skill, promptTokens) {
  const haystack = tokenize(`${skill.name} ${skill.description}`).filter(
    (w) => !STOPWORDS.has(w)
  );
  const haystackSet = new Set(haystack);
  let hits = 0;
  for (const token of promptTokens) {
    if (STOPWORDS.has(token)) continue;
    if (haystackSet.has(token)) hits += 2;
    // partial match: token is substring of a haystack word
    else if (haystack.some((h) => h.includes(token) || token.includes(h))) hits += 1;
  }
  return hits;
}

async function main() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;

  let prompt = "";
  try {
    const parsed = JSON.parse(input);
    prompt = parsed.prompt || parsed.message || "";
  } catch {
    prompt = input;
  }

  if (!prompt.trim()) process.exit(0);

  const index = loadIndex();
  if (!index.length) process.exit(0);

  const promptTokens = tokenize(prompt).filter((w) => !STOPWORDS.has(w));
  if (!promptTokens.length) process.exit(0);

  const scored = index
    .map((skill) => ({ ...skill, score: score(skill, promptTokens) }))
    .filter((s) => s.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SKILLS);

  if (!scored.length) process.exit(0);

  const active = scored.filter((s) => !s.archive);
  const archived = scored.filter((s) => s.archive);

  const list = scored
    .map((s) => `  • ${s.name}${s.archive ? " [archive]" : ""} — ${s.description.slice(0, 80)}…`)
    .join("\n");

  const activeNames = active.map((s) => s.name).join(", ");
  const archivedNames = archived.map((s) => s.name).join(", ");

  let msg = `[SKILLS ROUTER] Relevant skills for this task:\n${list}\n`;
  if (activeNames) msg += `MANDATORY — call via Skill tool: ${activeNames}\n`;
  if (archivedNames) msg += `MANDATORY — read + apply from ~/.claude/skills-archive/: ${archivedNames}\n`;

  process.stderr.write(msg);
  process.exit(0);
}

main().catch(() => process.exit(0));
