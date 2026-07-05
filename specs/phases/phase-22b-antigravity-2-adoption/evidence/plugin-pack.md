# G3 plugin-pack live validation — 2026-07-05, agy 1.0.16

```
$ node bin/momentum.js antigravity plugin-pack <tmp>
  ✓ plugin packed (6 files).
$ agy plugin validate <tmp>/.agents/plugins/momentum
[ok]    .../plugins/momentum
        ✔ skills      : 5 processed
        - agents      : skipped (not found)
        - commands    : skipped (not found)
        - mcpServers  : skipped (not found)
```

Note: the validator also recognizes `agents` and `commands` plugin subdirs — undocumented in the builtin guide; recorded as future surfaces.
