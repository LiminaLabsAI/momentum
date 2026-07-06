# momentum — website

The public site for [momentum](https://github.com/LiminaLabsAI/momentum),
served at <https://trymomentum.github.io>. A custom [Astro](https://astro.build)
static site (no docs framework) on a cobalt / glassmorphic / Geist design
system.

## Structure

```
site/
├── src/
│   ├── pages/
│   │   ├── index.astro         # marketing home (light, glassmorphic)
│   │   └── [...slug].astro      # renders every docs entry at /{slug}/
│   ├── layouts/
│   │   ├── BaseLayout.astro     # <html> shell, fonts, OG meta, ambient bg, theme
│   │   └── DocsLayout.astro     # docs shell: topbar, sidebar, TOC, ⌘K palette, prev/next
│   ├── content/docs/            # docs source (Markdown / MDX) — the `docs` collection
│   ├── lib/docsNav.ts           # sidebar order + prev/next model
│   ├── plugins/remark-asides.mjs   # :::note / :::tip → <aside>
│   └── styles/                  # tokens.css (design system) + mermaid.css
├── scripts/
│   ├── generate-og-cards.mjs    # prebuild: SVG → public/og/*.png (sharp)
│   └── check-dist-content.mjs   # postbuild: fails the build on empty page bodies
└── astro.config.mjs
```

## Commands

| Command           | Action                                                  |
| ----------------- | ------------------------------------------------------- |
| `npm install`     | Install dependencies                                    |
| `npm run dev`     | Dev server at `localhost:4321`                          |
| `npm run build`   | Prebuild OG cards → build to `./dist/` → content gate   |
| `npm run preview` | Preview the production build locally                    |

## Notes

- **Mermaid** blocks render to inline SVG at build via `rehype-mermaid`
  (needs a Playwright Chromium; `excludeLangs: ['mermaid']` keeps Shiki off
  those blocks). Zero client JS for diagrams.
- **Fonts** (Geist / Geist Mono) are self-hosted via `@fontsource-variable/*`
  and **icons** are inlined via `astro-icon` — no external CDN requests.
- The **home** is pinned light; **docs** default light with a persisted
  light/dark toggle (`data-theme` on `<html>`).
