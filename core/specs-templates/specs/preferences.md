---
type: Preferences
---

# Project Preferences

> Inferred by momentum init — confirm at `/start-project` or edit anytime.
> Recipes read these at execution time; missing/unknown values fall back to
> npm/GitHub defaults with a warning. This file is version-controlled project
> content — edit freely.

| Key | Value |
|-----|-------|
| language | node |
| framework | none |
| test_command | npm test |
| build_command | npm run build |
| publish_target | npm |
| git_forge | github |
| release_command | gh release create |
| release_flow | tag-and-publish |
| end_state | merge-after-yes |
| branch_flow | staging, main |
| protected_branches | staging, main |

## Notes

_(none — edit freely. `momentum init`/`upgrade` overwrite this file ONLY when
it is absent; once you edit it, your content is preserved. The
`protected_branches` row is derived from `branch_flow` — edit `branch_flow`
and re-run `momentum upgrade` to refresh it.)_
