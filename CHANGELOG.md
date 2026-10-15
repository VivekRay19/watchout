# CHANGELOG — WATCH OUT

All notable changes to **WATCH OUT** are documented in this file.

## [1.2.0] - 2026-10-15 — Major Graphics, UI/UX, Road System and Air Defense Overhaul

### 1. Visual & Terrain Overhaul
- **Multi-Octave Organic Landscape**: Replaced harsh and abrupt terrain edges with smooth, rolling elevations combining low-frequency continental swells and high-frequency ridge detail.
- **Geological Shading & Splat Blending**: Implemented slope-dependent dynamic texturing separating sheer cliff rock faces from fertile meadow turf, beach sands, and alpine ridges with procedural micro-noise.
- **Hydrological Meandering Channel**: Re-engineered river paths using smooth Hermite-eased profiles and gentle bank slopes to prevent water clipping through sharp cliffs.
- **PBR Architectural Realism**: Upgraded building models from primitive colored blocks to detailed structures with recessed window embrasures, horizontal floor mullions, gabled roofs, balconies, and rooftop HVAC chillers and communication masts.
- **Landmark Skyscraper**: Commissioned a high-rise commercial center featuring perimeter structural cross-bracing, crown rooftop equipment, and illuminated emergency helipad.

### 2. High-Fidelity Military Infrastructure
- **Phased-Array Early Warning Radar**: Replaced flat dishes with realistic 3D lattice truss gantries, parabolic microwave reflectors, and dual feeds rotating on an azimuth turntable.
- **HEMTT Tactical SAM Battery**: Upgraded missile installations to an 8-wheel heavy extended mobility tactical truck platform equipped with a 360° rotating turret base, elevating pitch mount, and quad boxed interceptor canisters.
- **Phalanx CIWS Point Defense**: Modeled after real-world close-in weapons systems with a radome search/track radar dome, traversing mount, and 6-barrel M61 Vulcan rotary cannon.
- **Hardened Command Citadel & Bunkers**: Added reinforced blast shields, communication antennae, and sloped earth embankments.
- **Joint Tactical Airbase**: Expanded airbase with runway threshold stripes, touchdown zone markings, taxiways, hardened aircraft blast shelters, and support hangars.

### 3. Interactive Two-Point Road Construction & Smart Snapping
- **Two-Point Drawing Mechanism**: Players now click an initial anchor point, view a dynamic continuous road preview displaying real-time length, orientation, and cost estimate, and click the destination to build.
- **Continuous Chaining**: Completing a road segment automatically sets the end point as the new start anchor, enabling rapid road grid development without repeated tool clicks. Right-click or ESC cleanly ends drawing.
- **Magnetic Endpoint Snapping**: Interactive road cursor automatically snaps to existing nearby road junctions within 7.5 units, highlighted with an animated glowing cyan target ring.
- **Intersection Junction Patches**: Automatically generates circular asphalt junction caps at multi-road intersections, eliminating holes, gaps, and z-fighting.
- **Bridge Pier Foundations & Lane Markings**: Elevated roads over water and valleys feature concrete support pylons, yellow centerline striping, and white outer lane borders.

### 4. Authoritative Air Defense & Combat Simulation
- **Continuous Threat Lifecycle States**: Replaced binary flags with an authoritative finite state machine: `UNDETECTED` -> `DETECTED` -> `TRACKED` -> `ENGAGED` -> `INTERCEPTED` -> `IMPACTED`.
- **Target Tracking & Weapon Lock**: Defense batteries actively acquire detected targets, orienting their 3D turrets in azimuth and elevating their pitch mount directly toward incoming threats.
- **Ammunition & Reload Cycle**: SAM batteries track remaining missiles (4 max), cycling into an 8-second realistic reload state once depleted, with visual UI reload gauges and combat logs.
- **Swept-Segment Collision Detection**: Implemented continuous swept-volume proximity tests along interceptor trajectory vectors, eliminating high-speed missile tunneling through targets between simulation frames.
- **Target Drone Training Drill**: Added a low-threat training drone spawner to guarantee players can observe their active defense systems in action during onboarding.

### 5. Streamlined UI/UX & Progressive Disclosure
- **Guided Onboarding Tutorial**: Implemented a non-intrusive, 7-step guided tactical tutorial card advancing dynamically on gameplay milestones (Roads -> Utilities -> Housing -> Economy -> Air Defense -> Interception Drill -> Offensive Missions). Fully skippable and replayable.
- **Clutter Elimination**: Tactical help manual and secondary menus now default to collapsed on first load, eliminating the overwhelming multi-panel startup clutter.
- **Top HUD Telemetry Modernization**: Streamlined primary resource telemetry with clean glassmorphic panels and an expandable drawer for secondary population and employment statistics.
- **Interactive Threat Banner**: Threat warning bar now features direct engagement status indicators ("ENGAGED", "TARGET SPLASH") and a one-click "Focus Camera" button.
- **Collapsible Radar Minimap**: Strategic minimap can be collapsed to maximize screen real estate, and allows direct click-to-pan teleportation to threats and coordinates.

---

## [1.1.0] - 2026-10-15

### Core Gameplay & Systems Implemented
- **3D Procedural World & Environment**:
  - 600x600 unit procedural rolling terrain with height-based biomes: sandy shoreline, fertile green meadows, rocky cliffs, and snow-dusted alpine ridges.
  - Meandering river basin flowing to a coastal deepwater bay with dynamic water wave animation.
  - High-density instanced forests containing over 2,400 pine conifers, oak trees, and rock boulders.
  - Smart vegetation clearing when constructing roads and buildings.
- **RTS Camera & World Controls**:
  - WASD / Arrow keys smooth pan with Shift boost.
  - Smooth mouse wheel zoom spanning from satellite regional map overview to street level.
  - Right-click camera orbit/tilt (azimuth and elevation angle).
  - Middle-click camera panning.
  - Terrain collision clamping to prevent underground camera clipping.
  - Quick camera reset hotkey and focus-on-target functions.
- **City Building & Road Networks**:
  - Connected road graph system supporting straight roads, intersections, and bridges over water.
  - Automatic bridge piers and safety railings when crossing water bodies.
  - Interactive 3D placement cursor with 4-unit grid snapping, collision validation, and rotation (R key).
  - 20+ specialized 3D buildings across 9 categories (Roads, Residential, Commercial, Industrial, Utilities, Services, Defense, Military, Research).
  - Night window illumination with warm glowing facades and streetlights.
- **Living City Simulation & Traffic**:
  - Moving civilian traffic (cars, trucks) following road nodes with dynamic night headlights.
  - Population growth model driven by housing capacity and citizen approval rating.
  - Employment dynamics matching commercial and industrial jobs with residents.
  - Utility distribution grid tracking power (MW) and water (m³/h), enforcing blackouts when capacity is exceeded.
  - Industrial material production: Steel, Concrete, Microelectronics, and Military Supplies.
- **Air Defense & Early Warning Radar**:
  - Rotating 3D phased-array radar dishes projecting holographic coverage rings onto the terrain.
  - Automatic detection and tracking of incoming hostile aerial threats.
  - Patriot SAM air-defense batteries with traversed 3D turrets and homing interceptor missiles with smoke trails.
  - Phalanx CIWS point-defense rapid-fire anti-drone protection.
  - Mid-air interception explosions with shockwaves and debris.
- **Hostile Threats & Rival Territory**:
  - Hostile Sector Charlie compound featuring a fortified command citadel, red radar tower, AA batteries, and aircraft hangars.
  - Hostile incursion waves: reconnaissance drones, terrain-hugging cruise missiles, and heavy bombers.
  - Direct impact consequences: HP damage, fire/smoke plumes, power interruptions, and emergency sirens.
- **Offensive Operations & Airbase Gameplay**:
  - Full-length illuminated concrete runway airbase hosting 5th-gen multirole stealth fighters.
  - Real takeoff sequences: taxiing, runway acceleration run, afterburner climb, mission flight, and landing approach.
  - Operations command center with 4 tactical strike missions: Reconnaissance Flight, Munitions Depot Strike, Maritime Interdiction, and Citadel Assault.
  - Bounties and rewards for successful operations.
- **Technology Tree & Progression**:
  - Four research branches: Civil, Industry, Defense, and Offense.
  - Real unlockable capabilities including high-density zoning, nuclear power, and stealth fighters.
- **Zero-Dependency Procedural Audio Engine**:
  - Synthesized Web Audio API soundscape: radar pings, air raid sirens, rocket launches, Gatling fire, heavy explosions, jet engine whoosh, and ambient city wind.
- **Tactical User Interface**:
  - Top HUD telemetry header with treasury, power/water meters, and threat indicators.
  - Bottom drawer construction menu with category tabs and stat cards.
  - Building inspector for health, repair, and demolition.
  - Real-time 2D radar strategic minimap with click-to-pan navigation.
  - Collapsible tactical event log and high-priority alert banners.
  - Full game state persistence with localStorage autosave and JSON export.

---

## [1.0.0] - 2026-10-15
- Initial project scaffolding and prototype architecture.
