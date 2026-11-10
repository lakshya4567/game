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

## Controls

| Control | Action |
| --- | --- |
| W / A / S / D | Move |
| Arrow keys | Move |
| Shift | Run |
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

**Graphics and environment alignment update**

- Replaced the plain background with a Three.js sky and directional sunlight.
- Added atmospheric fog and improved tone mapping.
- Centralised terrain height calculation so trees, grass, road and player use the same ground-height function.
- Rebuilt the road as a terrain-following mesh.
- Improved the procedural character from a simple capsule into a recognisable human-shaped placeholder.
- Added simple arm and leg movement while walking and running.
- Capped renderer pixel ratio and kept environment geometry lightweight.

## Known limitations

- The character is a procedural placeholder, not a professionally rigged animated model.
- Character-to-tree collision is not implemented yet.
- The character follows terrain height, but does not yet tilt to match steep slopes.
- The world is currently a bounded prototype; infinite/chunk-based terrain streaming is not implemented.
- Trees are stylised low-poly models, not photorealistic asset models.

## Planned milestones

1. Add tree/rock collision and slope-aware movement.
2. Replace the placeholder character with a rigged GLB model.
3. Add detailed rocks, shrubs, village buildings and landmarks.
4. Add drivable vehicles and enter/exit interaction.
5. Add chunk-based world streaming and level-of-detail.
6. Add settings, save/load and deployment.

## Performance notes

The project is designed to start lightweight. Keep texture sizes and shadow quality modest until performance is measured on the target PC. Increase scene detail gradually and profile before adding large asset packs.

## Development rule

Update this README.md with every future project update, including new features, changed controls, setup changes and known limitations.
