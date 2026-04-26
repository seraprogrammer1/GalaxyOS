---
name: Ethereal Pro
colors:
  surface: '#11131c'
  surface-dim: '#11131c'
  surface-bright: '#373943'
  surface-container-lowest: '#0c0e17'
  surface-container-low: '#191b24'
  surface-container: '#1d1f29'
  surface-container-high: '#282933'
  surface-container-highest: '#32343e'
  on-surface: '#e1e1ef'
  on-surface-variant: '#d4c2c2'
  inverse-surface: '#e1e1ef'
  inverse-on-surface: '#2e303a'
  outline: '#9d8d8d'
  outline-variant: '#504444'
  surface-tint: '#ecbaba'
  primary: '#ffe4e4'
  on-primary: '#472828'
  primary-container: '#f4c2c2'
  on-primary-container: '#734e4e'
  inverse-primary: '#7b5455'
  secondary: '#d9baf7'
  on-secondary: '#3d2557'
  secondary-container: '#573e72'
  on-secondary-container: '#caace8'
  tertiary: '#eae8ff'
  on-tertiary: '#292b5d'
  tertiary-container: '#c9caff'
  on-tertiary-container: '#515387'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad9'
  primary-fixed-dim: '#ecbaba'
  on-primary-fixed: '#2f1314'
  on-primary-fixed-variant: '#613d3e'
  secondary-fixed: '#efdbff'
  secondary-fixed-dim: '#d9baf7'
  on-secondary-fixed: '#270e41'
  on-secondary-fixed-variant: '#543c6f'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1fd'
  on-tertiary-fixed: '#131547'
  on-tertiary-fixed-variant: '#404275'
  background: '#11131c'
  on-background: '#e1e1ef'
  surface-variant: '#32343e'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '300'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '300'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 0.5rem
  sm: 1rem
  md: 2rem
  lg: 4rem
  xl: 8rem
  gutter: 24px
  margin: 48px
---

## Brand & Style

The design system is anchored in a "Celestial Futurism" aesthetic, evoking the serene clarity of the upper atmosphere and the vastness of the cosmos. It targets high-end audiences seeking a premium, meditative digital experience that feels both technologically advanced and emotionally resonant.

The visual style is a sophisticated blend of **Glassmorphism** and **Minimalism**. It relies on high-fidelity translucency, multi-layered "ambient" shadows, and a restrained use of vibrant cosmic accents. The interface should feel light, as if elements are floating in a zero-gravity environment, characterized by:
- **Weightless Depth:** Layers are defined by light refraction rather than heavy borders.
- **Atmospheric Transitions:** Motion is fluid and eased, mimicking the slow drift of celestial bodies.
- **Clarity through Contrast:** Despite the soft palette, critical information is anchored by deep indigo accents to ensure accessibility and professional rigor.

## Colors

The palette simulates a transition from deep space to the soft glow of a planetary dawn. The default mode is **Dark**, utilizing a deep obsidian base to allow the translucent glass layers to catch light effectively.

- **Primary (Dawn Pink):** Used for primary calls to action and highlighting active states. It provides a warm, human touch to the coldness of space.
- **Secondary (Twilight Purple):** Used for secondary interactions, iconography, and subtle gradients.
- **Tertiary (Cosmic Indigo):** A grounding color used for deep background surfaces, heavy shadows, and information headers.
- **Glass Effect:** All surfaces use a multi-stop linear gradient (white at 10% to white at 2%) with a `backdrop-filter: blur(20px)` to create the signature frosted aesthetic.

## Typography

This design system exclusively utilizes **Space Grotesk** to lean into a technical yet elegant futuristic feel. The hierarchy is defined by dramatic shifts in scale and weight.

- **Display & Headlines:** Use light weights (300/400) with tight letter-spacing to create a sophisticated, editorial look.
- **Body Text:** Use a slightly increased line-height (1.6) to ensure readability against translucent backgrounds.
- **Captions & Labels:** Always use the Semi-Bold (600) weight with generous letter-spacing and uppercase styling to ensure small-scale legibility and a "navigational" feel.

## Layout & Spacing

The layout philosophy prioritizes "Air" and "Negative Space." It uses a **Fixed Grid** system (12 columns) for desktop, but spacing between components is intentionally oversized to prevent the UI from feeling cramped.

- **The 8px Rhythm:** All padding, margins, and component heights are multiples of 8px.
- **Generous Margins:** Content containers should maintain a 48px minimum margin from the viewport edge to enhance the "floating" effect.
- **Information Density:** Keep it low. Group related elements within glass containers and use white space as a primary separator rather than lines or dividers.

## Elevation & Depth

Depth in this design system is achieved through **Backdrop Refraction** and **Multi-Layered Shadows**. Avoid solid dropshadows.

1.  **Level 1 (Base):** Deep obsidian background (#0B0D14).
2.  **Level 2 (The Nebula):** Diffused radial gradients of Twilight Purple and Cosmic Indigo at 10% opacity, floating behind glass layers.
3.  **Level 3 (Glass Surface):** Semi-transparent white fill (5%) with 20px - 40px backdrop blur.
4.  **Shadow System:** Every glass element features a dual shadow:
    *   *Inner Shadow:* A 1px white stroke at 15% opacity on the top-left edge to simulate a light source.
    *   *Outer Shadow:* A large, diffused indigo shadow (Blur: 60px, Spread: -10px, Opacity: 30%) to ground the floating element.

## Shapes

The design system uses **Rounded** geometry to maintain a soft, approachable feel amidst the technical typography. 

- **Containers:** Large glass cards use `rounded-xl` (1.5rem) to feel like smooth, weathered pebbles or polished spacecraft modules.
- **Interactive Elements:** Buttons and inputs use `rounded-lg` (1rem).
- **Decorative Elements:** Use perfectly circular shapes for avatars and status indicators to contrast against the rectangular grid.

## Components

### Buttons
- **Primary:** Solid Dawn Pink background with Deep Indigo text. On hover, a subtle glow effect (`box-shadow`) expands.
- **Glass (Secondary):** Translucent background with a 1px white border (10% opacity). Text in Dawn Pink.

### Cards
All cards must implement the `backdrop-filter: blur(20px)`. They should have a subtle top-to-bottom gradient border to simulate light hitting the top edge of the glass.

### Input Fields
Inputs should be "Ghost style"—transparent backgrounds with a simple bottom border in Twilight Purple. When focused, the border glows and a faint glass background fades in.

### Chips & Tags
Small, pill-shaped elements with Cosmic Indigo backgrounds and high-contrast Dawn Pink labels. They should appear almost "illuminated."

### Transitions
Utilize `cubic-bezier(0.23, 1, 0.32, 1)` for all transitions (the "Quintic Out" ease). This creates a snappy start with a long, smooth deceleration, reinforcing the high-end, celestial feel.