# momentum — brand pack

The **fast-forward** mark: three chevrons as a forward-motion speed trail.
Lowercase wordmark, single cobalt hue, Geist type.

---

## 1. Colors

| Token            | Value      | Use                                  |
| ---------------- | ---------- | ------------------------------------ |
| Cobalt (brand)   | `#0023AE`  | The mark. The only brand hue.        |
| Ink (wordmark)   | `#15161C`  | The "momentum" wordmark text         |
| On dark          | `#FFFFFF`  | Mark + wordmark on dark surfaces     |

Type: **Geist**, weight **600**, letter-spacing ≈ `-0.03em`, always lowercase
(`momentum`). Never title-case or all-caps the wordmark.

---

## 2. Files

```
brand/
├── momentum-mark.svg               static mark, cobalt
├── momentum-mark-white.svg         static mark, white (dark bg)
├── momentum-mark-currentcolor.svg  static mark, inherits CSS `color` (themeable)
├── momentum-lockup.svg             mark + wordmark, horizontal
├── momentum-mark-animated.svg      looping mark (CSS-in-SVG, self-contained)
├── momentum-lockup-animated.svg    looping lockup
├── favicon.svg                     tight-crop mark for favicons
├── react/MomentumLogo.jsx          drop-in component (load-once + hover)
└── png/
    ├── momentum-mark-{512,256,128,64,32}.png   transparent raster
    ├── momentum-app-{512,256,180}.png          cobalt app / touch icons
    └── favicon-{32,16}.png                      legacy favicon raster
```

---

## 3. When does it animate?

Restraint is the rule — a constantly-looping logo looks cheap and distracts.

- **On page load** → one forward sweep, then rest. (~0.55s)
- **On hover** (nav / footer logo) → one quick sweep.
- **Never loop** on the site chrome.
- **Favicon & app icons** → always static (must read at 16px).
- **`prefers-reduced-motion`** → no motion; the mark just appears.
- **Continuous loop is OK only** for a loading / "agent working" state —
  use `momentum-*-animated.svg` or `<MomentumLogo loop />` there.

The React component implements load-once + hover for you.

---

## 4. Integrate — React (recommended)

Copy `react/MomentumLogo.jsx` into your components folder.

```jsx
import { MomentumLogo } from "@/components/MomentumLogo";

// nav lockup (mark + wordmark), animates on load + hover
<MomentumLogo wordmark size={28} />

// mark only
<MomentumLogo size={24} />

// on a dark bar
<MomentumLogo wordmark color="#fff" inkColor="#fff" />

// loading / agent-working state → continuous sweep
<MomentumLogo loop size={40} />
```

Replace the existing nav brand block with `<MomentumLogo wordmark />`.

---

## 5. Integrate — plain HTML / CSS (no React)

Inline the SVG (so CSS can drive load + hover) and add this once:

```html
<a class="mm-brand" href="/">
  <svg class="mm-mark" viewBox="0 0 48 48" width="28" height="28" fill="none" aria-label="momentum">
    <path class="c1" d="M11 15 20 24 11 33"/>
    <path class="c2" d="M20 15 29 24 20 33"/>
    <path class="c3" d="M29 15 38 24 29 33"/>
  </svg>
  <span class="mm-word">momentum</span>
</a>
```

```css
.mm-brand{display:inline-flex;align-items:center;gap:9px;text-decoration:none}
.mm-word{font:600 20px/1 Geist,system-ui,sans-serif;letter-spacing:-.03em;color:#15161C}
.mm-mark path{stroke:#0023AE;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;
  transform-box:fill-box;transform-origin:center;animation:mm-in .55s cubic-bezier(.2,.7,.2,1) both}
.mm-mark .c1{--b:.3}.mm-mark .c2{--b:.6;animation-delay:.09s}.mm-mark .c3{--b:1;animation-delay:.18s}
.mm-brand:hover .mm-mark path{animation:mm-in .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes mm-in{from{opacity:0;transform:translateX(-6px)}to{opacity:var(--b);transform:none}}
@media (prefers-reduced-motion:reduce){.mm-mark path{animation:none;opacity:var(--b)}}
```

For dark backgrounds set `.mm-mark path{stroke:#fff}` and `.mm-word{color:#fff}`.

---

## 6. Favicon & app icons — add to `<head>`

```html
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/png/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/brand/png/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/brand/png/momentum-app-180.png">
<meta name="theme-color" content="#0023AE">
```

PWA `manifest.json`:

```json
{
  "icons": [
    { "src": "/brand/png/momentum-app-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/brand/png/momentum-app-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#0023AE"
}
```

(For 192 use `momentum-app-256.png` or re-export at 192 if you need the exact size.)

---

## 7. Clear space & minimum size

- Keep clear space around the mark equal to **one chevron's height**.
- Minimum mark size: **16px** (favicon). Minimum lockup width: **120px**.
- Don't recolor (cobalt or white only), rotate, add shadows/gradients to the
  mark, stretch, or change the wordmark case/weight.
