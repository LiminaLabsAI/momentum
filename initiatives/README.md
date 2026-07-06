# Initiatives

> Cross-repo features that span multiple member repos.

Each initiative is one markdown file named `NNNN-<slug>.md` with YAML
frontmatter (id, slug, status, started, owner, repos) and a body of
fixed sections: Why · Per-repo contributions · Linked decisions ·
Deploy chronology · Close.

Numbering is monotonically increasing across the ecosystem. The
filename slug is for human readability; the `id` integer is canonical.

## Create a new initiative

```
momentum ecosystem initiative create <slug> \
  --why "<one-paragraph motivation>" \
  --repos <member-id-1>,<member-id-2> \
  --owner <you>
```

Flags are optional:
- `--why` — defaults to a placeholder you can fill in later
- `--repos` — defaults to all registered members
- `--owner` — defaults to `git config user.name` (or `$USER`)

The slash-command door `/initiative create <slug>` does the same
work via the same code path; both end up calling
`core/ecosystem/lib/initiative.js`.
