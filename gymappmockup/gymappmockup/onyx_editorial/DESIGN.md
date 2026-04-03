# Design System Document: High-End Editorial Dark Mode

## 1. Overview & Creative North Star
**Creative North Star: "The Monolith"**
This design system rejects the "app-like" clutter of traditional fitness trackers in favor of a prestigious, editorial experience. It draws inspiration from high-fashion lookbooks and architectural brutalism. By utilizing aggressive negative space, razor-sharp edges (0px border radius), and a strict monochrome palette, we create an environment of focus and discipline. The goal is to make every workout feel like a curated session in a high-end, private gallery. We break the template look through intentional asymmetry—such as oversized display typography paired with microscopic labels—creating a rhythmic visual tension that guides the eye.

## 2. Colors & Tonal Depth
The palette is a study in darkness. We do not use color to highlight; we use light and depth.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. To define boundaries, designers must use **Surface Shifting**. A card does not have an outline; it exists because its `surface_container_low` background sits atop a `surface_dim` floor. 

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials.
- **Base Layer:** `surface_dim` (#131313) or `surface_container_lowest` (#0e0e0e) for the deep background.
- **Mid Layer:** `surface_container` (#201f1f) for primary content sections.
- **Top Layer:** `surface_container_highest` (#353534) for interactive elements or modals.
*Nesting Example:* Place a `surface_container_high` workout card inside a `surface_container_low` scroll area to create a "recessed" or "elevated" feel without a single stroke.

### Signature Textures
To avoid a flat, "digital" look, use a subtle radial gradient on large surfaces: transitioning from `surface_bright` (#3a3939) at the top-left to `surface` (#131313) at the bottom-right. This mimics the way gym lighting hits a matte black wall.

## 3. Typography
Typography is the primary driver of hierarchy. We use **Manrope** for high-impact editorial moments and **Inter** for data-dense utility.

- **Display (Manrope):** Used for "Hero" stats (e.g., total weight lifted). Set with tight letter-spacing (-0.04em) to feel heavy and authoritative.
- **Headline (Manrope):** Used for workout titles. These should often be oversized to create an asymmetrical "anchor" on the page.
- **Label (Inter):** All-caps with increased letter-spacing (+0.1em). This provides a technical, sophisticated contrast to the large headlines.
- **Body (Inter):** Reserved for descriptions. Keep line lengths short to maintain the editorial column feel.

## 4. Elevation & Depth
In this system, "Elevation" is a measure of light, not physical shadow.

- **The Layering Principle:** Use the `surface-container` tiers to "stack" importance. Higher importance = lighter surface. 
- **Ambient Shadows:** Shadows are rarely used. When necessary (e.g., a floating Action Button), use a `primary` color shadow at 4% opacity with a 40px blur. This creates a "glow" rather than a drop shadow.
- **The "Ghost Border" Fallback:** For accessibility in form inputs, use `outline_variant` at 10% opacity. It should be felt, not seen.
- **Glassmorphism:** For top navigation bars or bottom sheets, use `surface_container` at 70% opacity with a 20px backdrop-blur. This ensures the editorial content behind it remains visible but diffused, maintaining a sense of immense spatial depth.

## 5. Components

### Buttons
- **Primary:** `on_primary_fixed` (#ffffff) background with `on_primary` (#1a1c1c) text. 0px border radius. Bold, all-caps.
- **Secondary:** `surface_container_highest` (#353534) at 50% opacity. No border.
- **Tertiary:** Text only, underlined with a 2px offset using `outline_variant`.

### Input Fields
- **Text Inputs:** No background fill. A single `outline_variant` bottom border (1px). Label hangs above in `label-sm` (Inter, All-Caps). Error states use `error` (#ffb4ab) but only for the text, never a thick red box.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines. 
- **The "Space-as-Divider" Rule:** Use exactly `24px` or `48px` of vertical white space to separate list items. 
- **Workout List Item:** Use a `surface_container_low` background. On tap/hover, transition to `surface_container_high`.

### Specialized Gym Components
- **Progress Monolith:** A vertical bar chart where the "active" bar is `primary` (white) and "inactive" bars are `surface_container_highest`. 
- **Set Tracker:** A grid of 0px squares. Completed sets are solid `primary`; upcoming sets are `outline_variant` Ghost Borders.

## 6. Do's and Don'ts

### Do:
- **Do** use extreme scale. A 40pt headline next to an 8pt label is encouraged.
- **Do** lean into 0px corners. Every element should feel like it was cut from stone.
- **Do** use "On-Surface-Variant" (#c6c6c6) for secondary text to maintain a low-contrast, premium feel.

### Don't:
- **Don't** use icons unless necessary. Favor text labels (Inter All-Caps) for a cleaner editorial look.
- **Don't** use "Success Green" or "Alert Red" for standard UI. Use white for "Good/Done" and subtle grays for "Pending." Only use `error` tokens for critical system failures.
- **Don't** use standard grids. Try offsetting your main content column by 10% to the right to create an asymmetric, high-fashion layout.