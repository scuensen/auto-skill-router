#!/usr/bin/env node
// Builds ~/.claude/skills-index.json from all installed skills.
// Run after installing new skills: node hooks/build-index.js
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILLS_DIR = path.join(os.homedir(), ".claude", "skills");
const OUT_PATH = path.join(os.homedir(), ".claude", "skills-index.json");

function extractDescription(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
    if (descMatch) return descMatch[1].trim().replace(/^['"]|['"]$/g, "");
  }
  // fallback: first non-empty paragraph line
  for (const line of content.split("\n")) {
    const l = line.trim();
    if (l && !l.startsWith("#") && !l.startsWith("---") && !l.includes(":")) {
      return l.slice(0, 200);
    }
  }
  return "";
}

if (!fs.existsSync(SKILLS_DIR)) {
  console.error(`Skills dir not found: ${SKILLS_DIR}`);
  process.exit(1);
}

const index = [];
for (const name of fs.readdirSync(SKILLS_DIR).sort()) {
  const skillFile = path.join(SKILLS_DIR, name, "SKILL.md");
  if (!fs.existsSync(skillFile)) continue;
  const content = fs.readFileSync(skillFile, "utf8");
  const description = extractDescription(content);
  index.push({ name, description });
}

fs.writeFileSync(OUT_PATH, JSON.stringify(index, null, 2));
console.log(`Built index: ${index.length} skills → ${OUT_PATH}`);
