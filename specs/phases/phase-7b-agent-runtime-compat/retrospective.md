---
type: Retrospective
---

# Phase 7b — Agent Runtime Compatibility: Retrospective

## Summary

Phase 7b shipped v0.9.0 and proved momentum's adapter architecture with the first non-Claude adapter.

Delivered:
- Adapter Contract v3 runtime metadata
- Codex adapter MVP: `AGENTS.md`, `.codex/hooks.json`, `.codex/commands/`
- Dynamic available-agent discovery in the CLI
- Claude Code install regression coverage
- Codex install/upgrade coverage
- ENH-018 tarball-shape test and `prepublishOnly: npm test`
- BUG-003 fix: skip AppleDouble `._*` / `.DS_Store` files during copy and file walking

## Lessons

1. **Compatibility first was the right call.** Building autonomous execution before Codex support would have made the engine inherit Claude-shaped assumptions.
2. **Adapter metadata is the right abstraction level.** Root instruction files and config files vary by agent; core should not know about `CLAUDE.md` vs `AGENTS.md`.
3. **Packaging tests pay for themselves.** The tarball-shape test now guards both Claude and Codex adapter surfaces before publish.

## Verification Evidence

Fresh verification on `staging` before merge to `main`:

```text
npm test
tests 62
pass 62
fail 0
```

`npm publish --access public` ran `prepublishOnly`, which re-ran `npm test`:

```text
npm test
tests 62
pass 62
fail 0
```

Post-publish verification:

```text
npm view @avinash-singh-io/momentum version
0.9.0
```

## Phase 7c Inputs

- Build autonomous execution and TDD on Adapter Contract v3.
- Treat the old `phase-7-subagent-engine` branch as reference only.
- Preserve the rule: core defines contracts; adapters exploit capabilities.
