# Frontend Design Skill

This skill enables creation of distinctive, production-grade frontend interfaces that prioritize high design quality and avoid generic aesthetics.

## Key Principles

**Design Philosophy**: Understand context before coding — identify purpose, tone, constraints, and what makes a design memorable. Choose a clear conceptual direction and execute it with precision.

**Aesthetic Execution**: Commit to intentional visual directions. Bold maximalism or refined minimalism — the critical factor is purposeful, cohesive design rather than intensity level alone.

**Technical Requirements**: Implementations must be production-grade, functional, and visually striking while maintaining coherence with the established aesthetic direction.

## Design Focus Areas

- **Typography**: Prioritize distinctive, characterful fonts over generic defaults (no Arial/Inter by default). Pair display and body fonts thoughtfully. Import from Google Fonts or use variable fonts.
- **Color & Theme**: Establish cohesive palettes using CSS custom properties. One dominant color, one sharp accent, one neutral base. No arbitrary color usage.
- **Motion**: Implement CSS animations strategically. Focus on high-impact moments: orchestrated page loads, state transitions, scroll reveals. Avoid scattered micro-interactions.
- **Composition**: Unexpected layouts with asymmetry, overlap, diagonal flow, and strategic negative space. Break the grid intentionally.
- **Visual Details**: Create depth through gradients, textures, noise overlays, and context-appropriate effects. Every surface should have intentional finish.

## What to Avoid

- Generic AI-generated aesthetics: overused font families, clichéd color schemes (purple+dark gradient for "AI"), predictable card layouts
- Cookie-cutter component libraries used without customization
- Animations that exist only for novelty rather than enhancing UX
- Inconsistent spacing and rhythm
- Default browser styles left intact

## Implementation Checklist

Before finalizing any UI, verify:
- [ ] Distinctive font loaded and applied throughout
- [ ] CSS variables defined for all colors and spacing
- [ ] At least one signature animation or visual effect
- [ ] Composition uses asymmetry or unexpected layout
- [ ] No default gray backgrounds or unstyled scrollbars
- [ ] Dark/light mode handled deliberately
- [ ] Responsive without becoming generic at mobile sizes
