# Open World — Browser Game

A single-player, third-person 3D browser game prototype built with **Three.js**, **JavaScript**, and **Vite**.

## Run locally

### Requirements
- Node.js 20.19+ or 22.12+
- VS Code (recommended)
- A modern browser with WebGL support

### Installation

1. Clone or download this repository.
2. Open the project folder in VS Code.
3. Open a terminal in the project folder.
4. Install dependencies:

   ```bash
   npm install
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.
Every push to the `main` branch automatically builds the game and deploys the
production files to GitHub Pages. You can also start a deployment manually from
the **Actions** tab by selecting **Deploy game to GitHub Pages** and choosing
**Run workflow**.

### One-time GitHub setup

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open the **Actions** tab and wait for **Deploy game to GitHub Pages** to finish.
4. Visit: https://lakshya4567.github.io/game/

The Vite configuration automatically uses `/game/` for GitHub Actions builds,
while keeping `/` for local development.

If the site does not appear immediately, check the latest workflow run in the
Actions tab. The first deployment can take a few minutes.

## Controls

| Control | Action |
| --- | --- |
| W / A / S / D | Move |
| Arrow keys | Move |
| Shift | Sprint |
| Hold and drag mouse | Rotate the camera |

## Current features

- Atmospheric procedural sky with sunlight.
- Fog and filmic tone mapping.
- Rolling procedural terrain.
- Curving road surface aligned to the terrain.
- Distant rolling hills.
- Low-poly forest with terrain-aligned tree placement.
- Instanced grass for reduced draw calls.
- Procedural third-person character with clothing, backpack, arms and legs.
- Basic walk/run limb swing.
- Follow camera and keyboard movement.
- Performance-conscious renderer settings for modest PCs.

## Latest update

**Village, traffic and visible river update**

- Replaced the plain background with a Three.js sky and directional sunlight.
- Added atmospheric fog and improved tone mapping.
- Centralised terrain height calculation so trees, grass, road and player use the same ground-height function.
- Rebuilt the road as a terrain-following mesh.
- Improved the procedural character from a simple capsule into a recognisable human-shaped placeholder.
- Added simple arm and leg movement while walking and running.
- Added smooth movement acceleration/braking, gradual turning and improved running animation.
- Added a crossing road, larger layered spruce trees, roadside village clusters and simple moving traffic.
- Carved a river channel into the terrain and raised the opaque glossy water surface so it remains visible.
- Kept the added environment procedural and lightweight for modest PCs.

## Known limitations

- The character is a procedural placeholder, not a professionally rigged animated model.
- Character collision with trees, roads and river banks is not implemented yet. The river is currently visual scenery and cannot be crossed as a physics obstacle.
- The character follows terrain height, but does not yet tilt to match steep slopes.
- The world is currently a bounded prototype; infinite/chunk-based terrain streaming is not implemented.
- Trees, houses and cars are stylised procedural models, not photorealistic assets.
- Cars are decorative traffic and cannot currently be entered or driven.
- Villages are scenery; doors and buildings are not interactive.

## Planned milestones

1. Add tree/rock collision and slope-aware movement.
2. Replace the placeholder character with a rigged GLB model.
3. Add detailed rocks, shrubs, village buildings and landmarks.
4. Add drivable vehicles and enter/exit interaction.
5. Add chunk-based world streaming and level-of-detail.
6. Add settings and save/load.

## Performance notes

The project is designed to start lightweight. Keep texture sizes and shadow quality modest until performance is measured on the target PC. Increase scene detail gradually and profile before adding large asset packs.

## Development rule

Update this README.md with every future project update, including new features, changed controls, setup changes and known limitations.


## Latest environment scale update

- Increased spruce height and crown size while keeping tree placement away from roads and the river.
- Enlarged homes and adjusted their proportions relative to the player character; homes now read as buildings several times taller than the character.
- Added multiple architectural silhouettes, wall colours, roof types, porches, chimneys and two-storey homes.
- Added simple villagers with strolling animation around all three village clusters.
- Refined cars with more recognisable body sections, glass, grille, bumpers, lighting and wheel hubs.
- Raised the river water plane within the carved channel so the blue water is visible above the river bed.


## Latest world and collision update

- Expanded the terrain, roads, river, forest distribution and playable boundaries to a 520 × 520 world.
- Increased the camera far plane and adjusted fog and shadow coverage for the larger map.
- Added conservative house-footprint collision so the player cannot walk through building walls or corners; movement can slide along a wall.
- Moved the eastern village farther from the river bend so its houses are not placed in the water.
- Added gentle animated surface waves to the river using lightweight vertex movement.
- The river is still scenery: water does not yet have swimming, buoyancy or crossing physics.
