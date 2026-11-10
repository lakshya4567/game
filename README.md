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


## Latest forest and collision update

- Increased the forest target from 245 to 24,500 spruce trees (100×), using four instanced meshes so the trees require only a small number of draw calls.
- Added a spatial collision grid for tree trunks; movement checks nearby cells rather than scanning every tree.
- Added tree-trunk collision with smooth axis-based sliding around obstacles.
- Replaced broad circular house collision with rotated rectangular footprints that more closely match each building's walls and corners.
- Disabled tree shadow casting for this dense forest to reduce GPU load on lower-end computers.
- The forest generator keeps trees clear of roads, the river corridor and village areas.
- Performance may still vary significantly on older integrated graphics; if frame rate is low, reduce the tree count or render distance.


## Latest woodland and visual polish update

- Reduced the forest from 24,500 to a target of 5,600 trees for a more open, navigable world and better performance.
- Added three tree silhouettes: layered spruce, broadleaf trees with clustered crowns, and tall-trunk woodland trees.
- Tall-trunk trees now have longer exposed trunks and higher crowns; tree heights and foliage colours vary naturally.
- Added per-instance foliage colour variation while keeping the trees instanced.
- Kept tree-trunk collision and the nearby-cell spatial grid with the new tree population.
- Added subtle vertex-colour variation across the meadow to avoid one flat green ground colour.
- Refined sky and sunlight settings for a softer, warmer outdoor appearance.
- Tree shadows remain disabled to keep the dense forest more manageable on older integrated graphics.


## Latest village roads, bridge and forest-floor update

- Added small-trunk trees to a portion of the woodland so the forest has more low-branching silhouettes alongside tall bare-trunk trees.
- Built a timber road bridge with an arched deck, railings, posts and stone supports over the river where the crossroad passes.
- Added separate dirt-and-gravel access lanes connecting all three villages to the main road network; the eastern village lane joins the crossroad on the far riverbank.
- Expanded meadow grass from 600 to 2,200 instanced blades, with several natural green/yellow-green shades.
- Expanded forest-floor variety with instanced shrubs, leafy bushes, fern-like plants and small flower patches in several colours.
- Kept the new vegetation instanced and lightweight, with clear areas around roads, riverbanks and village clusters.


## Latest model-detail and sky realism update

- Reworked atmospheric scattering with a warmer low-angle sun, clearer blue upper sky, balanced hemisphere fill and slightly refined exposure.
- Added sixteen softly shaded procedural cloud formations with gentle drift across the horizon.
- Added house foundations, framed windows, vertical window dividers, front doorsteps and small metal door knobs to give village homes more architectural detail.
- Refined the instanced tree trunks with flared roots and a naturally tapered profile.
- Added car side mirrors, door handles, side trim and a layered front grille.
- Added small facial features and a cap brim to the player character.
- Kept the scene procedural and avoided large external texture downloads so the game remains practical to run on lower-end integrated graphics.


### Forest placement and tree realism update
- Fixed floating trunks by aligning the base of each tapered trunk mesh directly with the sampled terrain height.
- Increased tree-free shoulders beside the main road, crossroad, river and village lanes.
- Added sampled curved-lane exclusion checks so trees cannot spawn in the middle of village roads.
- Kept the forest instanced and low-poly to preserve performance on lower-end PCs.


## Latest real-model environment update

- Added the approved CC0 Norway spruce, detailed oak and silver birch GLB tree assets.
- Added near/far tree detail switching: up to 30 nearby trees per species use the real GLB model, while distant trees keep the existing low-cost instanced geometry.
- Tree GLBs are converted into instanced mesh batches, rather than creating a separate Three.js object for every tree.
- Replaced village house placeholders with locally hosted bungalow, stone house, modern house and adobe house GLB assets. The original procedural houses remain as a fallback if a model file cannot be loaded.
- Kept model loading asynchronous and cached so each asset is loaded only once per game session.
- Adjusted house collision footprints to match the loaded model dimensions.
- All seven GLB files are stored in `public/models/` and served from the game's own GitHub Pages origin, avoiding third-party CORS restrictions.

### Third-party model sources and licences

The original selected assets are published as CC0 by their providers. The files are now copied into `public/models/` and loaded locally by the game:

- `mature-norway-spruce-tree.glb` — [Mature Norway spruce tree — Innerscene](https://www.innerscene.com/tools/library/3d-parts/mature-norway-spruce-tree-48c2566f)
- `oak-detailed.glb` — [Oak street tree, detailed leaves — Innerscene](https://www.innerscene.com/tools/library/3d-parts/oak-street-tree-detailed-leaves-a273fef9)
- `birch-tree.glb` — [Mature silver birch tree — Innerscene](https://www.innerscene.com/tools/library/3d-parts/mature-silver-birch-tree-8e297753)
- `bungalow.glb` — [Bungalow — Grab3D](https://grab3d.com/models/buildings/bungalow/)
- `stone-house.glb` — [Stone House — Grab3D](https://grab3d.com/models/buildings/stone-house/)
- `modern-house.glb` — [Modern House — Grab3D](https://grab3d.com/models/buildings/modern-house/)
- `adobe-house.glb` — additional house model supplied for this project.

The tree models are real GLB geometry, but the oak's detailed leaf mesh and the full house assets can still be demanding on older integrated graphics. The near/far tree split limits how many detailed tree instances are active at once; actual frame rate still needs testing on the target PC. House styles cycle across all four local models, including the adobe house.

## Latest character scale and performance update

- Reduced the player character to 82% of its previous size so it looks more proportionate beside village buildings.
- Enlarged village placements and increased the fit area for all four GLB house models; house collision bounds continue to follow the scaled model dimensions.
- Added camera-frustum and distance checks for individual forest proxy instances so trees outside the view or beyond the local render range are hidden.
- Reduced the forest target from 5,600 to 2,800 trees, nearby detailed GLB tree instances from 30 to 7 per species, and their detail distance from 76 to 48 world units.
- Reduced grass and undergrowth counts, cloud and hill counts, and disabled real-time shadow maps for better performance on older integrated graphics.
- Reduced the renderer pixel-ratio cap to 1.0 and removed per-frame river normal recalculation.
- Kept ordinary Three.js object frustum culling enabled; visible terrain, roads and landmarks remain in the scene.
- Performance still needs to be checked on the target PC. These changes trade some distant scenery detail for smoother gameplay.


## Latest building level-of-detail update

- Added three distance-based building detail levels: the full GLB house model at close range, the existing detailed procedural house at medium range, and a simplified wall-and-roof silhouette at long range.
- House detail changes are updated alongside the forest LOD checks, rather than rebuilding models every frame.
- The existing instanced low-poly tree shapes continue to act as the distant tree representation, while nearby trees can switch to the detailed GLB assets.
- The distance thresholds are conservative starting values and should be tuned after checking frame rate and visual transitions on the target PC.


## House LOD visual matching update

- Reworked the medium-distance house models to keep the same approximate footprint, wall height and roof silhouette as the close models.
- Added subtle low-resolution wall and roof surface textures using small reusable textures.
- Medium LODs retain only the main walls, roof, a small number of windows and a door; small decorative details are omitted.
- Far LODs remain simple colour silhouettes for low rendering cost.


## Tree distance LOD update

- Close trees use the detailed local GLB assets where available.
- Medium-distance trees use the existing multi-part procedural tree shapes.
- Far-distance trees switch to a much lighter trunk-and-crown representation, with simple materials and no shadows.
- Tree visibility is culled outside the camera view and beyond the 260-unit forest range.

## World startup initialization fix

- Moved the player group declaration ahead of asynchronous tree and house model loading so LOD callbacks cannot access the player binding before initialization.
