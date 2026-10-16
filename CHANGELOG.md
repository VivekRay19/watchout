# CHANGELOG — WATCH OUT

All notable changes to **WATCH OUT** are documented in this file.

## [2.2.0] - 2026-10-16 — Game Engine, Flight Physics, Multi-Channel Air Defense & Municipal Banking Overhaul

### 1. Spline Road Ribbon Generation & Terrain Cut-and-Fill Grading
- **Corridor Cut-and-Fill Grading**: Added `gradeRoadCorridor` to `TerrainGenerator` and integrated it directly into `RoadSystem.addSegmentInternal`. When road segments are laid across sloping terrain, ground vertices within the road width are carved and leveled to match the road profile, with smooth Hermite shoulder transitions to eliminate terrain clipping.
- **Slope Compliance & Bridge Promotion**: Enforced 25% maximum grade check on road segments; roads exceeding 25% grade or crossing waterways automatically upgrade to reinforced concrete girder bridges with piers.

### 2. Deep City Economy & Municipal Banking System
- **First Sovereign Bank of Metropolis (`BankingModal`)**: Added full loan management system featuring:
  - 3 fictional loan tiers: *Short-Term Commercial Line of Credit* ($15,000 @ 4.5%), *Municipal Infrastructure Bond* ($45,000 @ 6.5%), and *National Strategic Defense Syndicate Loan* ($100,000 @ 9.0%).
  - Amortized hourly repayment schedules deducted from city treasury, credit score dynamics (300 to 850 scale), and 0% penalty early repayment.
  - Strict financial constraints: maximum 2 concurrent active loans and tier duplication lockouts.

### 3. Layered Multi-Channel Air Defense Network
- **Concurrent Tracking Channels**: Upgraded `DefenseSystem` from single-target lock to multi-channel fire-control. SAM batteries now maintain up to 4 concurrent tracking channels (`assignedTargetIds`), allowing simultaneous engagement of multiple incoming threats.
- **Weapon System Differentiation**:
  - Point-Defense CIWS (rapid-fire 0.8s, 60m range, single tracking channel).
  - Multi-Target SAM Battery (4 concurrent tracking channels, 140m+ range).

### 4. Arcade Flight Mechanics & 9-Stage Authoritative Flight State Machine
- **Arcade Flight Model**: Overhauled `AirTrafficSystem` with 3 distinct fighter classes: Interceptor (speed 24-32), Multirole (speed 20-26), and Stealth (speed 28-36).
- **9-Stage Flight Lifecycle**: Fighters now operate strictly through `PARKED` → `TAXIING` → `TAKEOFF` → `CLIMB` → `EN_ROUTE` → `ENGAGING` → `RETURNING` → `APPROACH` → `LANDING`, featuring climb pitch and bank-to-turn roll.

### 5. Dynamic Difficulty Director & Automated Verification Suite
- **DifficultyDirector**: Added adaptive threat wave coordinator scaling incursion frequency, swarm density, missile speed, and stealth penetrations based on population, GDP, and defensive readiness.
- **Automated Verification**: Added test suite validating loan amortization, credit score tracking, multi-channel locks, and adaptive threat escalation.

---

## [2.1.0] - 2026-10-16 — Living World, Graphics, Animation & Gameplay Upgrade

### 1. Terrain, Shoreline & Living Water Upgrade
- **Rolling Hills & Elevation Variation**: Added sculpted northern and western hills with smooth vertex-blended transitions between meadow grass, warm soil, golden sand, coastal rock, and hillside forest.
- **Coastal Islets & Twin Lighthouses**: Added two rocky islets in the right bay topped with red-and-white striped coastal lighthouses and rotating beacon beams.
- **Animated River & Bay Water**: Upgraded the water surface to a high-resolution vertex-animated wave mesh with depth-shaded turquoise-to-azure coloring, subtle shoreline foam strips, and animated V-shaped wakes behind moving ships.

### 2. Architectural Variation & Staged Construction
- **Multi-Variant Low-Poly Buildings**:
  - **Residential**: 4 distinct suburban home variants (`res_low`) with varied heights, roof shapes, pastel facades, fences, driveways, and garden bushes, plus 3 mid-rise apartment variants (`res_suburb`) with balconies and rotating rooftop HVAC fans.
  - **Commercial**: 3 shop variants (`com_retail`) with striped awnings and parking spaces, shopping plaza (`com_mall`), and sleek glass office towers (`com_skyscraper`).
  - **Industrial**: Upgraded factory complex (`ind_factory`) featuring spherical refinery gas-holder domes, twin red-and-white striped smokestacks, and an animated rotating yellow jib crane; logistics warehouse (`ind_warehouse`) with loading bays and rotating crane.
  - **Military & Airbase**: Full tactical airbase (`mil_airbase`) with asphalt runway, threshold markings, edge lights, 3 arched aircraft hangars, air-traffic control tower with rotating radar, and 2 red-and-white lattice radio masts.
- **Staged Building Construction & Repair**: Newly placed buildings progress through foundation, structural framing with scaffolding, and completed operational stages with real-time progress visible in the Building Inspector.

### 3. Event-Driven World Animation & Traffic Simulation
- **Dedicated `AnimationSystem`**: Centralizes simulation-bound animations (wind-swaying instanced trees via GPU vertex shader, rotating radars, rooftop HVAC fans, industrial jib cranes, park fountain spray, lighthouse beams, factory smoke, cooling tower steam, and moving container cargo ships). All animations respect simulation pause/speed and building power/operational status.
- **Route-Finding Traffic & Intersection Signals**: Upgraded `TrafficSystem` and `RoadSystem` with 6 vehicle types (sedans, yellow taxis, delivery vans, cargo trucks, city buses, military trucks) featuring spinning wheels, BFS shortest-path routing across connected road nodes, safe following distances, and working red/green traffic signals at multi-way intersections.
- **Smooth Day/Night Cycle & Economy Depth**: Continuous Sunrise, Day, Sunset, and Night lighting transitions synchronized with building window lights, streetlights, runway lights, and vehicle headlights; added Residential/Commercial/Industrial zone demand, pollution, and traffic congestion modeling.

### 4. Refined Interface Layout
- **Top-Left Getting Started Card**: Relocated `TutorialCard` below the top-left brand emblem with a `"Show Tips"` expandable drawer so it never overlaps the bottom toolbar.
- **Interactive Top-Right Minimap**: Added a live canvas `Minimap` with terrain, water, road network, building markers, vessels, threat blips, camera viewport box, and click-to-pan navigation.
- **7-Category Construction Dock**: Expanded the bottom toolbar to `Roads`, `Residential`, `Commercial`, `Industrial`, `Infrastructure`, `Defense`, and `Military`.

---

## [2.0.0] - 2026-10-16 — Clean, Colorful Isometric City-Builder Redesign
- Redesigned WATCH OUT around a clean, colorful low-poly isometric city-builder aesthetic with connected road snapping/splitting, authoritative air-defense interception, and a compact UI.

---

## [1.2.0] - 2026-10-15 — Major Graphics, UI/UX, Road System and Air Defense Overhaul
- Added multi-octave terrain, two-point road drawing, air-defense state machine, and 7-step tutorial.
