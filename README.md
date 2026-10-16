# WATCH OUT
### BUILD. DEFEND. STRIKE. (v2.2.0)

**WATCH OUT** is a clean, colorful 3D isometric city-builder and territorial defense strategy game. Build connected road networks, pastel residential neighborhoods, commercial plazas, industrial ports, and utilities while safeguarding your city with early-warning radar towers, SAM batteries, and offensive airbase operations.

---

## What's New in Version 2.2.0

- **Spline Road Corridors & Cut-and-Fill Grading**: Automatic terrain grading cuts and fills the earth directly beneath road splines, providing flat graded roadbeds with smooth Hermite shoulders that prevent road surfaces from clipping through sloped hills. Includes 25% max-grade detection and auto-bridge conversion.
- **First Sovereign Bank of Metropolis (`BankingModal`)**: 3 fictional municipal loan tiers (*Short-Term Commercial Line of Credit*, *Municipal Infrastructure Bond*, and *National Strategic Defense Syndicate Loan*) with amortized debt service deductions, credit scores (300-850), and 0% penalty early repayment.
- **Layered Multi-Channel Air Defense**: Patriot SAM batteries now maintain up to 4 concurrent tracking channels (`assignedTargetIds`), allowing defense sites to lock and engage multiple incoming threats simultaneously.
- **Arcade Flight Physics & 9-Stage Flight Model**: Interceptor, Multirole, and Stealth fighter classes with climb pitch, bank-to-turn roll, and strict 9-stage lifecycle (`PARKED` → `TAXIING` → `TAKEOFF` → `CLIMB` → `EN_ROUTE` → `ENGAGING` → `RETURNING` → `APPROACH` → `LANDING`).
- **Dynamic Threat Difficulty Director**: Adaptive threat scaling based on population, GDP, and defensive readiness.
- **Automated Verification Suite**: Built-in test suite for flight states, banking amortization, defense channels, and difficulty progression.

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
