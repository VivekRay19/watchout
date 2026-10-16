# WATCH OUT
### BUILD. DEFEND. STRIKE. (v2.1.0)

**WATCH OUT** is a clean, colorful 3D isometric city-builder and territorial defense strategy game. Build connected road networks, pastel residential neighborhoods, commercial plazas, industrial ports, and utilities while safeguarding your city with early-warning radar towers, SAM batteries, and offensive airbase operations.

---

## What's New in Version 2.1.0

- **Living World & Event-Driven Animation (`AnimationSystem`)**: GPU wind-swaying trees, animated water waves with shoreline foam, moving container cargo ships with wakes, active airbase fighter patrols, rotating radars, rooftop HVAC fans, industrial jib cranes, lighthouse beacon beams, and factory/power-plant smoke/steam tied to real simulation and power states.
- **Architectural Variation & Staged Construction**: Multiple low-poly building variants across residential, commercial, and industrial categories, spherical refinery domes, multi-hangar tactical airbase with ATC tower, coastal lighthouses, and staged building construction/repair with live progress in the Building Inspector.
- **Route-Finding Traffic & Intersection Signals**: 6 vehicle categories (sedans, yellow taxis, delivery vans, cargo trucks, buses, military trucks) with spinning wheels, BFS pathfinding across connected roads, safe following distances, and working red/green traffic signals at multi-way intersections.
- **Smooth Day/Night Cycle & Economic Depth**: Continuous Sunrise, Day, Sunset, and Night lighting transitions plus Residential/Commercial/Industrial zone demand, pollution, and traffic congestion modeling.
- **Refined Interface**: Top-left Getting Started card with expandable tips, interactive top-right Minimap with click-to-pan, and a 7-category bottom construction toolbar (`Roads`, `Residential`, `Commercial`, `Industrial`, `Infrastructure`, `Defense`, `Military`).

---

## Controls

| Action | Control |
| :--- | :--- |
| **Pan Camera** | `W`, `A`, `S`, `D`, Arrow Keys, Left/Middle-Click + Drag, or Click Minimap |
| **Orbit / Tilt Camera** | Right-Click + Drag |
| **Zoom In / Out** | Mouse Scroll Wheel |
| **Rotate Building Preview** | `R` Key |
| **Cancel Placement / Deselect** | `ESC` Key or Right-Click |
| **Inspect Building** | Left-Click on any 3D Building |

---

## How to Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
