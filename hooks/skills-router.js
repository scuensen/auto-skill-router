#!/usr/bin/env node
// Auto Skill Router v2 — https://github.com/scuensen/auto-skill-router
// Reads user prompt, scores all 1400+ skills, injects top matches into system-reminder.
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const INDEX_PATH = path.join(os.homedir(), ".claude", "skills-index.json");
const MAX_SKILLS = 5;
const MIN_SCORE = 3;

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
    .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" }[c]))
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

const STOPWORDS = new Set([
  // English
  "use", "when", "this", "that", "with", "for", "and", "the", "or", "are",
  "is", "it", "in", "to", "of", "a", "an", "be", "by", "on", "at", "if",
  "as", "do", "we", "you", "can", "will", "have", "has", "had", "not",
  "from", "your", "also", "any", "all", "more", "new", "how", "what",
  "build", "create", "implement", "add", "get", "set", "run", "make",
  "user", "code", "data", "file", "app", "task", "help", "need", "want",
  "using", "building", "creating", "implementing", "writing", "adding",
  "include", "including", "such", "these", "their", "which", "about",
  "feature", "system", "service", "pattern", "best", "practices", "work",
  // German
  "ich", "mich", "mir", "wir", "uns", "sie", "ihr", "ihn", "ihm",
  "ein", "eine", "einen", "einem", "einer", "eines",
  "der", "die", "das", "dem", "den", "des",
  "ist", "sind", "war", "waren", "wird", "werden", "wurde", "wurden",
  "hat", "haben", "hatte", "hatten",
  "mit", "von", "bei", "aus", "auf", "fuer", "nach", "ueber", "unter",
  "kann", "koennen", "soll", "sollen", "muss", "muessen", "darf",
  "baue", "bau", "mach", "erstell", "zeig", "erklaer", "schreib",
  "jetzt", "auch", "noch", "dann", "aber", "wenn", "weil", "damit",
  "hier", "dort", "alle", "viele", "keine", "nicht", "kein", "mehr",
  "bitte", "mal", "kurz", "einfach", "schnell", "gut", "alles",
]);

function score(skill, promptTokens) {
  const nameTokens = tokenize(skill.name).filter((w) => !STOPWORDS.has(w));
  const descTokens = tokenize(skill.description).filter((w) => !STOPWORDS.has(w));
  const nameSet = new Set(nameTokens);
  const descSet = new Set(descTokens);

  let hits = 0;
  for (const token of promptTokens) {
    if (STOPWORDS.has(token) || token.length < 3) continue;
    // Name match: higher weight
    if (nameSet.has(token)) { hits += 4; continue; }
    if (nameTokens.some((h) => strictPartial(h, token))) { hits += 2; continue; }
    // Description match
    if (descSet.has(token)) { hits += 2; continue; }
    if (descTokens.some((h) => strictPartial(h, token))) { hits += 1; }
  }
  return hits;
}

// Partial match only if both strings >= 5 chars and shared substring >= 5 chars
function strictPartial(a, b) {
  if (a.length < 5 || b.length < 5) return false;
  if (a.includes(b) && b.length >= 5) return true;
  if (b.includes(a) && a.length >= 5) return true;
  return false;
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
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SKILLS);

  if (!scored.length) process.exit(0);

  const active = scored.filter((s) => !s.archive);
  const archived = scored.filter((s) => s.archive);

  const list = scored
    .map((s) => `  • ${s.name}${s.archive ? " [archive]" : ""} (${s.score}) — ${s.description.slice(0, 75)}…`)
    .join("\n");

  let msg = `[SKILLS ROUTER] Relevant skills for this task:\n${list}\n`;
  if (active.length) msg += `→ Skill tool: ${active.map((s) => s.name).join(", ")}\n`;
  if (archived.length) msg += `→ Read file: ${archived.map((s) => `~/.claude/skills-archive/${s.name}/SKILL.md`).join(", ")}\n`;
  msg += `MANDATORY: invoke ALL of the above BEFORE starting work.\n`;

  process.stderr.write(msg);
  process.exit(0);
}

main().catch(() => process.exit(0));
