# WATCH OUT
### BUILD. DEFEND. STRIKE. (v1.2.0)

**WATCH OUT** is a high-polish 3D city-building and territorial military strategy game. It merges the deep urban planning, road construction, utilities, and economy simulation of modern city-builders with real-time tactical air defense, radar detection networks, and offensive operations against rival hostile sectors.

---

## What's New in Version 1.2.0

- **Realistic Multi-Octave Terrain & Biomes**: Organic rolling elevations, slope-dependent geological rock texturing, natural sandy shorelines, and gentle river valleys.
- **High-Fidelity 3D Architecture**: Detailed residential, commercial, and industrial buildings with recessed windows, floor mullions, gabled roofs, balconies, rooftop HVAC mechanical units, and a landmark skyscraper with an emergency helipad.
- **Detailed Military Installations**: Rotating lattice phased-array radar dishes, 8-wheel HEMTT tactical SAM launcher trucks with 360° azimuth and pitch-elevating mounts, Phalanx CIWS point defense domes, and reinforced command bunkers.
- **Interactive Two-Point Road Construction**: Dynamic road preview with real-time cost and distance estimation, magnetic endpoint junction snapping with cyan glowing targeting rings, seamless intersection junction patches, and continuous road chaining.
- **Authoritative Air Defense Combat Simulation**: Continuous threat lifecycle tracking (`UNDETECTED` -> `DETECTED` -> `TRACKED` -> `ENGAGED` -> `INTERCEPTED` -> `IMPACTED`), true 3D turret aiming, ammunition tracking with realistic reload delays, and swept-segment continuous collision detection preventing missile tunneling.
- **Guided Onboarding Tutorial**: Streamlined 7-step progressive tutorial card guiding new commanders through building their city and testing air defenses with target drones.
- **Modernized UI/UX**: Eliminated startup clutter with progressive disclosure, collapsible secondary telemetry, one-click threat camera focus, and collapsible radar minimap.

---

## Key Gameplay Features

1. **Expansive 3D Environment**:
   - 600x600 unit procedural rolling terrain with river channels, coastal bay, rocky mountains, and animated water.
   - Dense instanced forests with thousands of pine conifers, oak trees, and rocks that clear dynamically when you build.
2. **Urban Planning & Two-Point Road Infrastructure**:
   - Two-point interactive drawing of asphalt streets, highways, and reinforced suspension bridges over water.
   - Automatic bridge piers, junction patches, and lane striping.
   - 20+ specialized structures across 9 categories (Roads, Residential, Commercial, Industrial, Utilities, Services, Defense, Military, Research).
   - Dynamic day/night cycle with illuminated building windows, streetlights, and moving civilian traffic with night headlights.
3. **Economic Simulation & Utility Grids**:
   - Population migration driven by housing capacity and citizen satisfaction.
   - Taxation and commercial revenue balanced against hourly building maintenance expenses.
   - Power (MW) and clean water (m³/h) grids with blackout and water-shortage consequences.
   - Industrial manufacturing producing Steel, Concrete, Microelectronics, and Military Supplies.
4. **Air Defense & Early Warning Radar**:
   - Rotating 3D phased-array radar stations that sweep the sky and project holographic coverage rings.
   - Incursions of hostile Shahed reconnaissance drones, terrain-hugging Kalibr cruise missiles, and heavy bombers.
   - Patriot SAM batteries that orient toward incoming threats and launch guided interceptor missiles with smoke trails.
   - Phalanx CIWS point-defense rapid-fire tracer interception.
5. **Airbases & Offensive Strike Missions**:
   - Full concrete runway airbases with hangars hosting 5th-gen multirole stealth fighters.
   - Realistic flight sequences: taxiing to runway, takeoff acceleration, afterburner climb, mission flight, and landing.
   - Strategic offensive operations: Reconnaissance Patrols, Munitions Depot Strikes, Maritime Interdiction, and Base Assaults.
6. **Technology Research Tree**:
   - 4 progression branches: Civil & Zoning, Industrial Logistics, Air Defense & Radar, and Air/Naval Strike.
7. **Procedural Web Audio Engine**:
   - 100% zero-dependency Web Audio API synthesizer generating jet engines, radar sweeps, SAM missile whooshes, alarms, flak bursts, and heavy explosions.
8. **Save & Load Persistence**:
   - LocalStorage autosaving, manual save checkpoints, and JSON file export/import.

---

## Tactical Controls

| Action | Control |
| :--- | :--- |
| **Pan Camera** | `W`, `A`, `S`, `D` or Arrow Keys (`Shift` for fast speed) |
| **Orbit / Tilt Camera** | Right-Click + Drag |
| **Drag Pan Camera** | Middle-Click + Drag |
| **Zoom In / Out** | Mouse Scroll Wheel |
| **Rotate Structure Preview** | `R` Key |
| **Cancel Placement / Deselect** | `ESC` Key |
| **Inspect Structure** | Left-Click on 3D Building Model |
| **Strategic Radar Pan** | Click anywhere on the Top-Right Radar Minimap |
| **Reset Camera View** | Reset Button on Top HUD |

---

## How to Run Locally

### Requirements
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+

### Commands
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

Open your browser at `http://localhost:3000` to launch the game.

---

## Tech Stack & Architecture
- **Framework**: React 18 + TypeScript + Vite
- **3D Graphics Engine**: Three.js (WebGL, PCF Soft Shadows, ACES Filmic Tone Mapping)
- **UI & Styling**: TailwindCSS + Lucide React Icons
- **Audio**: Web Audio API Procedural Synthesizer
- **Save Engine**: Versioned JSON schema with LocalStorage and exportable files
