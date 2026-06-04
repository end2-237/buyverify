# UI UX Pro Max Skill

AI-powered design intelligence for professional UI/UX development. Provides a complete design system reasoning engine for any stack.

## Design System Generator

When starting any UI task, automatically generate a tailored design system:

1. **Analyze** project type, audience, and brand tone
2. **Select** style direction from the palette below
3. **Generate** cohesive tokens: colors, typography, spacing, radius, shadows
4. **Apply** consistently across all components

## 67 UI Styles (selection)

| Style | Use case | Key traits |
|---|---|---|
| Glassmorphism | SaaS, AI tools | Blur, transparency, luminous borders |
| Claymorphism | Consumer apps | Soft shadows, rounded, pastel fills |
| Minimalism | Editorial, docs | Whitespace, one accent, no decoration |
| Brutalism | Portfolio, art | Raw type, flat color, no softening |
| Neumorphism | Dashboards | Inset/outset shadows, monochromatic |
| Bento Grid | Landing pages | Asymmetric card grid, mixed sizes |
| Dark Mode Premium | Dev tools, AI | Deep blacks, neon accents, glows |
| AI-Native UI | AI products | Streaming text, thinking states, gradients |
| Retro/Y2K | Brand, marketing | Pixel borders, chrome, nostalgic palettes |
| Corporate Clean | B2B, finance | Blue tones, trust signals, structured |

## 161 Color Palettes — Industry Mapping

- **AI / Tech**: Deep navy + electric violet + cyan glow
- **Finance / Fintech**: Deep blue + gold accent + white space
- **Health / Medical**: Clean white + emerald + soft gray
- **Creative / Design**: Bone white + ink black + one bold color
- **E-commerce**: Warm white + brand color + conversion orange
- **Gaming**: Pure black + neon green/magenta + chrome
- **Education**: Soft blue + warm yellow + readable neutrals

## 57 Font Pairings

**Premium Dark UI**
- Display: `Clash Display` or `Cabinet Grotesk`
- Body: `Geist` or `Inter`

**Editorial / Content**
- Display: `Playfair Display`
- Body: `Source Serif 4`

**Tech / Developer**
- Display: `Space Grotesk`
- Body: `JetBrains Mono` (code) + `Inter` (prose)

**Futuristic / AI**
- Display: `Orbitron` or `Exo 2`
- Body: `Rajdhani` or `Nunito`

**Brutalist**
- Display: `Anton` or `Bebas Neue`
- Body: `IBM Plex Mono`

## 161 Reasoning Rules (key subset)

1. Never use more than 3 font weights in a single view
2. Primary CTA must have 4.5:1 contrast ratio minimum
3. Spacing scale must be mathematical (4px base, 8/12/16/24/32/48/64/96)
4. Every interactive element needs 3 states: default, hover, active
5. Loading states must match the visual weight of their content
6. Error states use red/amber — never blue
7. Success states use green — never gray
8. Empty states must include an illustration or meaningful icon
9. Modal overlays: 60-80% black, blur(8px) behind
10. Sticky headers reduce height by 25% on scroll
11. Never place text on a gradient without a darkening overlay
12. All icons from a single consistent family
13. Border radius must be consistent: either all sharp, all rounded, or one clear rule
14. Card shadows: single source of light, never multiple directions
15. Animation duration: 150ms (micro), 300ms (standard), 500ms (entrance)

## Tech Stack Support

React · Next.js · Vue · Nuxt · Angular · Svelte · Astro · Laravel · SwiftUI · Flutter

## Anti-Pattern Validator

Flag these when detected:
- `className="text-gray-500"` on primary content text
- Background `#f5f5f5` or `#fafafa` without intentional purpose
- Generic `<Card>` components from UI libraries used without visual customization
- `border-radius: 8px` applied universally without a design rationale
- Animations using `transition: all` instead of specific properties
