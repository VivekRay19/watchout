# CHANGELOG — WATCH OUT

All notable changes to **WATCH OUT** are documented in this file.

## [2.0.0] - 2026-10-16 — Clean, Colorful Isometric City-Builder Redesign

### 1. Art Direction & Visual Overhaul
- **Isometric Camera & Readable City Blocks**: Switched to a narrow-FOV (26°) isometric camera projection with clear depth, parallel street lines, and smooth pan/zoom/orbit navigation.
- **Bright, Cohesive Palette**: Redesigned terrain, water, roads, and buildings around a sunlit palette of azure/turquoise water, golden sandy beaches, vibrant spring meadow greens, soft slate-grey roads, and pastel architectural materials.
- **Smooth Sculpted Terrain**: Eliminated noisy procedural ground grain textures and uneven bumps in favor of a flat, smooth central peninsula and eastern bank separated by a river channel and coastal harbor bay, framed by sculpted rocky hills.
- **Simple, Elegant Low-Poly 3D Models**:
  - **Residential**: Cozy pastel homes with coral-red, cerulean-blue, and warm-orange pitched roofs, fenced yards, and mid-rise pastel apartment blocks.
  - **Commercial & Civic**: Colorful red, yellow, and white storefronts, sleek azure-blue glass office towers with crisp white mullions, a central park with a circular fountain and cherry-blossom trees, and a white-and-turquoise hospital with a rooftop helipad.
  - **Industrial & Harbor**: Clean manufacturing factory with a red-and-white striped smokestack, logistics warehouse, waterfront harbor pier with stacked colorful shipping containers, red gantry crane, and moored yacht/corvette.
  - **Military & Air Defense**: Fenced defense compound featuring a white spherical radome ("golf ball") radar tower on a tapered support structure, olive-green 8x8 SAM launcher trucks, and a northern tactical airbase.
- **Varied Low-Poly Trees**: Layered forest-green conifers on hills, plump rounded deciduous trees along streets, and pastel-pink cherry blossom trees in parks and plazas.

### 2. Genuinely Connected Roads & Intersections
- **Mid-Segment T-Junction Splitting**: Clicking on the middle of any existing road segment automatically splits the segment and inserts a shared `RoadNode` so T-junctions are topologically and visually connected.
- **Automatic 4-Way Crossroads**: Drawing a road across an existing road automatically detects the intersection point, splits both segments, and links all four arms into a unified intersection node.
- **Clean Trimmed Road Geometry**: Curbs and dashed white centerlines trim back cleanly at intersections, replaced by flush asphalt junction hubs, corner sidewalk fillets, and white zebra crosswalks without z-fighting.
- **Right-Hand Lane Traffic**: Colorful low-poly sedans and delivery trucks drive in their proper right-hand lanes across connected streets and bridges.

### 3. Authoritative Air-Defense Simulation
- **Noise-Free Coverage Rings**: Radar and SAM range rings stay hidden during peaceful city building and appear only when placing/inspecting defense assets or during active threat alerts.
- **Full Detection-to-Interception Loop**: Radars and SAM batteries detect incoming aerial threats, smoothly aim their 3D turrets in azimuth and pitch, draw subtle target-lock lines, launch visible white-and-orange interceptor missiles, and resolve mid-air engagements via swept-segment collision detection.
- **One-Click Air Defense Drill**: Added a "Test Air Defense" action in the Defense toolbar and onboarding tutorial to spawn a live target drone at any time.

### 4. Streamlined, Minimalist UI Design
- **Compact Top Bar**: Displays the WATCH OUT brand emblem, essential resources (`$50,000` treasury, `1,240` population, `85%` power, `92%` water), date/time (`Apr 14, 2025 10:30 AM`), simulation speed controls (`Pause`, `Play`, `Fast`), and a clean Settings button.
- **Single Friendly Tutorial Card**: Compact bottom-left onboarding card featuring a construction engineer avatar and concise step-by-step guidance.
- **Simple 5-Button Bottom Toolbar**: Clean bottom dock (`Roads`, `Residential`, `Commercial`, `Industry`, `Defense`) with sky-blue active highlighting and on-demand building trays.
- **Progressive Disclosure**: Advanced military panels, tech research, detailed statistics, and combat logs stay hidden until opened by the player.

---

## [1.2.0] - 2026-10-15 — Major Graphics, UI/UX, Road System and Air Defense Overhaul
- Added multi-octave terrain, two-point road drawing, air-defense state machine, and 7-step tutorial.

---

## [1.1.0] - 2026-10-15
- Initial 3D city-builder and air-defense simulation systems.

---

## [1.0.0] - 2026-10-15
- Initial project scaffolding and prototype architecture.
