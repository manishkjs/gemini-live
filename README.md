# Gemini Live for Developers

Production architecture, audio engineering, tokenomics, 4-pillar optimization patterns, and drop-in coding agent skill (`SKILL.md`) for building real-time duplex voice agents on the **Gemini Live API** (`BidiGenerateContent`).

- **Live Documentation Site:** [https://manishkjs.github.io/gemini-live/](https://manishkjs.github.io/gemini-live/)
- **Drop-In Agent Skill (`SKILL.md`):** [https://manishkjs.github.io/gemini-live/SKILL.md](https://manishkjs.github.io/gemini-live/SKILL.md)

```bash
mkdir -p .agents/skills/gemini-live
curl -fsSL https://manishkjs.github.io/gemini-live/SKILL.md \
  -o .agents/skills/gemini-live/SKILL.md
```

## Local Docs Development

```bash
cd docs-site
npm ci
npm run dev      # http://localhost:4321/gemini-live
npm run build    # outputs static site to docs-site/dist/
```
