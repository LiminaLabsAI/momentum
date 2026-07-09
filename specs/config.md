---
type: Config
---

# Project Config

> Inferred by momentum init — confirm at `/start-project` or edit anytime.
> Recipes read these at execution time; missing/unknown values fall back to
> npm/GitHub defaults with a warning. This file is version-controlled project
> content — edit freely.

| Key | Value |
|-----|-------|
| language | node |
| framework | none |
| test_command | npm test |
| build_command | none |
| publish_target | npm |
| git_forge | github |
| release_command | gh release create |
| release_flow | tag-and-publish |
| end_state | merge-after-yes |
| branch_flow | staging, main |
| protected_branches | staging, main |

## Notes

- `end_state` accepts `merge-after-yes` (default) · `staging-promotion` ·
  `feature-branch-only` · `open-pr` (Phase 27). It drives cleanup timing: when
  the agent lands on the terminal `branch_flow` branch, `lanes land`/`complete-phase`
  auto-clean the worktree + branch + state; for the human/forge-merge modes,
  cleanup defers to `momentum lanes reconcile` (verify-before-clean). This repo
  uses `merge-after-yes`.
