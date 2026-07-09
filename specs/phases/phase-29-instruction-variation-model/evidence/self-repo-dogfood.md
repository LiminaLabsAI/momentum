# Phase 29 — Self-repo dogfood evidence (2026-07-10)

`momentum upgrade .` on the momentum self-repo (installed: claude-code + opencode).
Out-of-scope pre-existing .opencode/commands drift reverted; only CLAUDE.md + AGENTS.md kept.

| Assertion | Result |
|---|---|
| CLAUDE.md spine === AGENTS.md spine (byte-identical neutral rules region) | true |
| CLAUDE.md header de-branded scaffold | true |
| AGENTS.md header de-branded scaffold (opencode) | true |
| AGENTS.md carries opencode integration section | true |
| In-Session Task Tool note present (both) | true |
| ecosystem pointer preserved (both) | true |
| project-rules pointer preserved (both, ADR-0010) | true |
| project name rendered (momentum) | true |
