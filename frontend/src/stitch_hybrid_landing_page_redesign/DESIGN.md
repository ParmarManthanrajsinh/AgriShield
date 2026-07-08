---
name: AgriShield Modern Organic
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#404943'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#707972'
  outline-variant: '#c0c9c0'
  surface-tint: '#30694c'
  primary: '#00351f'
  on-primary: '#ffffff'
  primary-container: '#0f4d32'
  on-primary-container: '#82bd9a'
  inverse-primary: '#98d4b0'
  secondary: '#006d43'
  on-secondary: '#ffffff'
  secondary-container: '#73fcb4'
  on-secondary-container: '#007347'
  tertiary: '#2b2e2d'
  on-tertiary: '#ffffff'
  tertiary-container: '#414443'
  on-tertiary-container: '#aeb1af'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b3f0cb'
  primary-fixed-dim: '#98d4b0'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#145135'
  secondary-fixed: '#73fcb4'
  secondary-fixed-dim: '#54de99'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#005231'
  tertiary-fixed: '#e1e3e1'
  tertiary-fixed-dim: '#c5c7c5'
  on-tertiary-fixed: '#191c1b'
  on-tertiary-fixed-variant: '#444746'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 56px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system bridges the gap between traditional agricultural wisdom and cutting-edge data science. It evokes a sense of "Technological Stewardship"—where the reliability of AI meets the grounded reality of the soil. The target audience includes both tech-forward farmers and institutional agricultural stakeholders who require precision without losing the human touch.

The visual style is a hybrid of **Modern Minimalism** and **Tactile Organicism**. We utilize clean, structured layouts to present complex data, but soften the technical edge with hand-drawn, illustrative flourishes and fluid, "blob-like" background shapes. The interface should feel professional, protective, and inherently connected to the earth.

## Colors

The palette is rooted in deep, forest greens to convey stability and growth. 

- **Primary (Forest Green):** Used for navigation, primary buttons, and authoritative headings.
- **Secondary (Vibrant Grass):** Used for call-to-actions, success states, and data highlights.
- **Background (Off-White):** A warm, paper-like neutral (`#F9FBF9`) that reduces eye strain compared to pure white.
- **Functional Neutrals:** A range of slate-greys for body text and subtle borders, ensuring high legibility against the organic background tones.

## Typography

This design system employs a strategic pairing of personality and precision. 

**Bricolage Grotesque** is used for headlines. Its unique, slightly quirky terminals mimic the organic irregularity of hand-drawn sketches while maintaining high-impact readability. It represents the "Agri" in the brand.

**Plus Jakarta Sans** is used for all UI elements, body copy, and data visualizations. Its geometric yet friendly proportions provide a modern, "Tech" feel that ensures clarity in data-dense dashboards. 

All display type should use tight tracking, while body copy maintains generous leading for a comfortable reading experience.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a refined 12-column system for desktop and a 4-column system for mobile. 

- **Organic Overlays:** Break the grid occasionally using decorative, hand-drawn "leaf" or "cloud" elements that bleed off the edges of containers to prevent the UI from feeling too rigid.
- **Rhythm:** We use an 8px base unit. Component padding should lean towards "Airy" (e.g., 24px or 32px) to reinforce the sense of openness found in rural landscapes.
- **Breakpoints:** 
  - Mobile: < 600px
  - Tablet: 600px - 1024px
  - Desktop: > 1024px

## Elevation & Depth

To maintain the "Modern Organic" feel, we avoid traditional heavy shadows. Instead, we use:

- **Tonal Layering:** Different shades of off-white and very pale green are used to distinguish the background from the card surfaces.
- **Soft Diffusion:** When depth is required (e.g., for modals), use a very large, low-opacity shadow (40px blur, 4% opacity) tinted with the Primary Forest Green.
- **Micro-Borders:** Cards use a thin, 1px stroke in a muted sage-green rather than a shadow, keeping the interface feeling crisp and paper-like.

## Shapes

The shape language is primarily **Rounded**, reflecting the soft curves found in nature. 

- **UI Elements:** Standard buttons and input fields use a 0.5rem radius.
- **Feature Cards:** Use a larger `rounded-xl` (1.5rem) to feel more inviting.
- **Illustrative Blobs:** Large, non-geometric organic shapes are used in the background to frame content, often with a "hand-cut" feel rather than a perfect mathematical curve.

## Components

- **Buttons:** Primary buttons are solid Forest Green with white text. Secondary buttons use a "Glass" effect—a subtle green border with a light-green translucent fill.
- **Chips:** Small, pill-shaped tags used for status indicators (e.g., "Active Crop", "Low Risk"). These use high-saturation secondary greens for positive states.
- **Cards:** White or off-white backgrounds with a 1px border. Feature cards may include a hand-sketched icon in the top-right corner to add character.
- **Inputs:** Clean, minimalist fields with Plus Jakarta Sans labels. Focus states use the Vibrant Secondary Green for the border highlight.
- **Icons:** Use a custom set that features "imperfect" line weights—mimicking a technical pen sketch. They should be professional and legible but lack the coldness of standard geometric icons.
- **Data Visualizations:** Charts should use a palette of greens, ochres, and earth tones. Avoid "techy" blues unless specifically representing water data.