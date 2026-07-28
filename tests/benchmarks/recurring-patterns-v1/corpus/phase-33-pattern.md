## The pattern this closes

Sixth variant of "green here, dead where it ships":

| | Where it was green | Where it was dead |
|---|---|---|
| BUG-002 | working tree | tarball glob |
| BUG-030 | tests injecting a root | `findRoot` in production |
| BUG-031 | tests calling `pollTurn` | no production caller existed |
| BUG-033 | working tree | published tarball (unvendored `hook.js`) |
| BUG-034 | claude-code's cwd | Antigravity's cwd |
| **Phase 33** | **working tree** | **momentum's own install** |

Every previous guard checks the working tree. `verify-published.sh` (v0.43.2)
closed the "what users download" half. This closes the "what momentum itself runs"
half — and that half was worse, because it is the install nobody thought to check
and therefore the one that drifted furthest.

