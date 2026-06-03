#!/usr/bin/env node
// Builds ~/.claude/skills-index.json from active + archived skills.
// Run after installing new skills: node ~/.claude/hooks/build-index.js
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, ".claude");
const SKILLS_DIRS = [
  { dir: path.join(CLAUDE_DIR, "skills"), archive: false },
  { dir: path.join(CLAUDE_DIR, "skills-archive"), archive: true },
];
const OUT_PATH = path.join(CLAUDE_DIR, "skills-index.json");

function extractDescription(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
    if (descMatch) return descMatch[1].trim().replace(/^['"]|['"]$/g, "");
  }
  for (const line of content.split("\n")) {
    const l = line.trim();
    if (l && !l.startsWith("#") && !l.startsWith("---") && !l.includes(":")) {
      return l.slice(0, 200);
    }
  }
  return "";
}

const index = [];
const seen = new Set();

for (const { dir, archive } of SKILLS_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).sort()) {
    if (seen.has(name)) continue; // active takes precedence
    const skillFile = path.join(dir, name, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;
    const content = fs.readFileSync(skillFile, "utf8");
    const description = extractDescription(content);
    index.push({ name, description, archive });
    seen.add(name);
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(index, null, 2));
const active = index.filter((s) => !s.archive).length;
const archived = index.filter((s) => s.archive).length;
console.log(`Built index: ${index.length} skills (${active} active + ${archived} archived) → ${OUT_PATH}`);
