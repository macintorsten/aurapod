---
name: AI Agent Instructions Meta-Guide
description: Principles for writing effective custom instructions and skills for AI agents
applyTo: ".github/**/*.{md,instructions.md}"
---

# Writing Instructions & Skills

**Primary Skill**: Use `writing-skills` skill for complete methodology (TDD for docs, testing with subagents, anti-patterns)

**Context**: Skills in `.github/skills/` are written for Claude but principles apply to GitHub Copilot.

## Core Principles (This Project)

1. **Radical Brevity** - 10-25 lines for instructions; fight for every token
2. **Navigation Over Education** - Point to files/code, don't explain concepts
3. **Skill Delegation** - Complex workflows → skills; instructions → signpost to skills
4. **Zero Duplication** - One source of truth per concept
5. **Trust Intelligence** - Agent knows fundamentals; provide navigation not tutorials
6. **Action-Oriented** - WHAT to do, WHERE to look (skip WHY unless critical)
7. **Conditional Loading** - Precise `applyTo` patterns to avoid irrelevant context

## Common Mistakes

❌ Explaining what agent already knows
❌ Duplicating skill content in instructions  
❌ Teaching instead of navigating
❌ Over-documenting discoverable patterns

## Examples in This Project

- [components.instructions.md](components.instructions.md) - 14 lines, skill-first, points to context
- [services.instructions.md](services.instructions.md) - 20 lines, DI pattern with file reference
- [tests.instructions.md](tests.instructions.md) - 12 lines, actionable, minimal

Each: brief, actionable, references skills/files.
