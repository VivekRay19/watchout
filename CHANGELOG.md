# CHANGELOG — WATCH OUT

All notable changes to **WATCH OUT** are documented in this file.

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
