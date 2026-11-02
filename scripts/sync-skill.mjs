#!/usr/bin/env node
/**
 * Synchronizes the canonical customer-safe SKILL.md across:
 *   1. ../.agents/skills/gemini-live-external/SKILL.md (when inside the authoring repo)
 *   2. public/SKILL.md (customer-facing frontmatter: name: gemini-live, no internal routing note)
 *   3. public/gemini-live/SKILL.md (byte-identical to public/SKILL.md)
 *   4. src/content/docs/gemini-live-skill.mdx (generated header + admonition-converted body)
 *
 * Usage:
 *   node scripts/sync-skill.mjs          # write public mirrors + regenerate gemini-live-skill.mdx
 *   node scripts/sync-skill.mjs --check  # fail with non-zero exit if any mirror or MDX drifts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');

const canonicalMonorepoSkill = path.resolve(
  siteRoot,
  '..',
  '.agents',
  'skills',
  'gemini-live-external',
  'SKILL.md',
);
const publicSkill = path.join(siteRoot, 'public', 'SKILL.md');
const publicNestedSkill = path.join(siteRoot, 'public', 'gemini-live', 'SKILL.md');
const skillMdxPath = path.join(siteRoot, 'src', 'content', 'docs', 'gemini-live-skill.mdx');

const MDX_HEADER = `---
title: "Agent Skill (SKILL.md)"
description: "Complete 25-section production engineering reference and downloadable SKILL.md for coding agents building on the Gemini Live API."
---

import { Aside } from '@astrojs/starlight/components';
import OneMinute from '../../components/OneMinute.astro';

<OneMinute
  what="The whole engineering reference as a single file your coding agent (Claude Code, Cursor, Gemini CLI, Windsurf) can load so it follows these rules automatically."
  why="It turns this site from reading material into guardrails your engineers' tools enforce while they write code."
  number="25 sections in one downloadable file."
  decide="Whether to make this file part of your team's standard agent setup."
/>

<div class="hero-card">
  <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem;">
    <div>
      <span class="badge badge-blue">DROP-IN AGENT SKILL</span>
      <span class="badge badge-green">25 PRODUCTION SECTIONS</span>
      <h3 style="margin: 0.5rem 0 0.25rem 0;">Install in Claude Code, Cursor, Gemini CLI, or Windsurf</h3>
      <p style="margin: 0; font-size: 0.92rem; color: var(--gl-text-secondary);">
        Save <code>SKILL.md</code> to <code>.agents/skills/gemini-live/SKILL.md</code> or <code>~/.gemini/config/skills/gemini-live/SKILL.md</code> so your coding agent automatically enforces all 25 Gemini Live protocol, audio, tool-calling, and token-optimization invariants.
      </p>
    </div>
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <a href="/gemini-live/SKILL.md" download="SKILL.md" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.1rem; border-radius: 8px; background: var(--sl-color-accent); color: #fff; font-weight: 600; text-decoration: none; font-size: 0.9rem;">
        ⬇ Download Full SKILL.md
      </a>
      <a href="/gemini-live/gemini-live/SKILL.md" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid var(--gl-card-border); background: var(--gl-card-bg-elevated); color: var(--gl-text-primary); font-weight: 500; text-decoration: none; font-size: 0.9rem;">
        View Raw SKILL.md ↗
      </a>
    </div>
  </div>
</div>

\`\`\`bash
mkdir -p .agents/skills/gemini-live
curl -fsSL https://manishkjs.github.io/gemini-live/SKILL.md \\
  -o .agents/skills/gemini-live/SKILL.md
\`\`\`

<Aside type="tip" title="Single Source of Truth (Zero Duplication)">
The 25 sections below render the complete, unabridged contents of \`SKILL.md\` directly on this page for fast browsing and search. Click **Download Full SKILL.md** above to grab the raw Markdown file with YAML frontmatter for your agent's skill directory.
</Aside>

---

`;

const ALERT_KIND_MAP = {
  WARNING: 'caution',
  CAUTION: 'danger',
  IMPORTANT: 'caution',
  NOTE: 'note',
  TIP: 'tip',
};

function renderPublicSkill(rawSkill) {
  let out = rawSkill;
  out = out.replace(/^name:\s*gemini-live-external\s*$/m, 'name: gemini-live');
  out = out.replace(
    /Customer-safe and public GitHub documentation guide for building production/,
    'Production engineering guide for building, debugging, and optimizing real-time',
  );
  out = out.replace(
    /\s*Use ONLY when authoring external customer-facing guides,[\s\S]*?use gemini-live-internal\./,
    ' Use whenever building, debugging, reviewing, or optimizing real-time voice or multimodal agents on the Gemini Live API.',
  );
  out = out.replace(
    /\n> \*\*Skill Routing Rule\*\*:[^\n]*\n\n?/,
    '\n',
  );
  return out;
}

function convertGithubAlertsToStarlight(markdownBody) {
  const lines = markdownBody.split('\n');
  const out = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(`{3,}|~{3,})/.test(line.trim())) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    const alertMatch = !inFence && line.match(/^>\s*\[!(WARNING|CAUTION|IMPORTANT|NOTE|TIP)\]\s*$/);
    if (!alertMatch) {
      out.push(line);
      continue;
    }

    const directive = ALERT_KIND_MAP[alertMatch[1]] || 'note';
    const blockLines = [];
    while (i + 1 < lines.length && /^> ?/.test(lines[i + 1])) {
      i++;
      blockLines.push(lines[i].replace(/^> ?/, ''));
    }

    let title = '';
    if (blockLines.length > 0) {
      const titleMatch = blockLines[0].match(/^\*\*(.+?):?\*\*\s*$/);
      if (titleMatch) {
        title = titleMatch[1].replace(/:$/, '');
        blockLines.shift();
        if (blockLines[0] === '') blockLines.shift();
      }
    }

    out.push(title ? `:::${directive}[${title}]` : `:::${directive}`);
    out.push(...blockLines);
    out.push(':::');
  }

  return out.join('\n');
}

function renderMdxFromSkill(skillContent) {
  const idx = skillContent.indexOf('\n## 1. ');
  if (idx === -1) {
    throw new Error('Could not find "## 1. " heading in SKILL.md');
  }
  const rawBody = skillContent.slice(idx + 1);
  return MDX_HEADER + convertGithubAlertsToStarlight(rawBody);
}

const checkOnly = process.argv.includes('--check');
const hasCanonical = fs.existsSync(canonicalMonorepoSkill);
const sourcePath = hasCanonical ? canonicalMonorepoSkill : publicSkill;

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing source SKILL.md at ${sourcePath}`);
  process.exit(1);
}

const rawSource = fs.readFileSync(sourcePath, 'utf8');
const expectedPublic = hasCanonical ? renderPublicSkill(rawSource) : rawSource;
const expectedMdx = renderMdxFromSkill(expectedPublic);

if (checkOnly) {
  const errors = [];
  for (const mirror of [publicSkill, publicNestedSkill]) {
    if (!fs.existsSync(mirror)) {
      errors.push(`Missing mirror: ${mirror}`);
    } else {
      const content = fs.readFileSync(mirror, 'utf8');
      if (content !== expectedPublic) {
        errors.push(`Mirror drifted from expected public SKILL.md: ${mirror}`);
      }
      if (!/^name:\s*gemini-live\s*$/m.test(content)) {
        errors.push(`Public SKILL.md missing expected "name: gemini-live" frontmatter: ${mirror}`);
      }
      if (/gemini-live-internal|Skill Routing Rule|Customer-safe and public GitHub documentation guide/i.test(content)) {
        errors.push(`Public SKILL.md contains internal routing instructions: ${mirror}`);
      }
    }
  }
  if (!fs.existsSync(skillMdxPath)) {
    errors.push(`Missing MDX page: ${skillMdxPath}`);
  } else if (fs.readFileSync(skillMdxPath, 'utf8') !== expectedMdx) {
    errors.push(
      `gemini-live-skill.mdx drifted from SKILL.md. Run "npm run sync-skill" to regenerate.`,
    );
  }
  if (errors.length > 0) {
    for (const err of errors) console.error(`[sync-skill] ERROR: ${err}`);
    process.exit(1);
  }
  console.log('[sync-skill] OK: SKILL.md mirrors and gemini-live-skill.mdx are in exact sync.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(publicSkill), { recursive: true });
fs.mkdirSync(path.dirname(publicNestedSkill), { recursive: true });
fs.writeFileSync(publicSkill, expectedPublic, 'utf8');
fs.writeFileSync(publicNestedSkill, expectedPublic, 'utf8');
fs.writeFileSync(skillMdxPath, expectedMdx, 'utf8');
console.log('[sync-skill] Synced public/SKILL.md, public/gemini-live/SKILL.md, and gemini-live-skill.mdx.');
