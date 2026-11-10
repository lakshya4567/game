import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './style.css';

// A performance-conscious Three.js open-world prototype.
// The same terrainHeight() function positions the terrain, road, vegetation
// and player, preventing props from being placed at an unrelated y = 0 level.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d7e5);
scene.fog = new THREE.FogExp2(0xb9d7e5, 0.00145);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1100);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'low-power'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#game').appendChild(renderer.domElement);

// External CC0 GLB assets are loaded once and cached. Procedural fallbacks remain
// in the scene if a model host is offline or blocks a cross-origin request.
const gltfLoader = new GLTFLoader();
const gltfPromises = new Map();
function loadGLTF(url) {
  if (!gltfPromises.has(url)) gltfPromises.set(url, gltfLoader.loadAsync(url));
  return gltfPromises.get(url);
}

// --- Atmosphere and sunlight -------------------------------------------------
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
// A clearer atmospheric scattering setup with a warm, low-angle sun.
skyUniforms.turbidity.value = 7.2;
skyUniforms.rayleigh.value = 2.1;
skyUniforms.mieCoefficient.value = 0.0042;
skyUniforms.mieDirectionalG.value = 0.78;

const sunDirection = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(78),
  THREE.MathUtils.degToRad(205)
);
skyUniforms.sunPosition.value.copy(sunDirection);

scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x56634a, 1.25));

const sun = new THREE.DirectionalLight(0xffedcf, 2.65);
sun.position.copy(sunDirection).multiplyScalar(120);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -135;
sun.shadow.camera.right = 135;
sun.shadow.camera.top = 135;
sun.shadow.camera.bottom = -135;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 250;
sun.shadow.bias = -0.00025;
scene.add(sun);

// --- Shared procedural terrain ------------------------------------------------
function baseTerrainHeight(x, z) {
  return (
    Math.sin(x * 0.030) * 1.45 +
    Math.cos(z * 0.026) * 1.25 +
    Math.sin((x + z) * 0.017) * 1.7 +
    Math.cos((x - z) * 0.012) * 0.65
  );
}

// Carve a shallow valley into the landscape so the river surface stays visible.
function terrainHeight(x, z) {
  const distanceFromRiver = Math.abs(x - riverCenterX(z));
  const channel = THREE.MathUtils.clamp(1 - distanceFromRiver / 10, 0, 1);
  const smoothChannel = channel * channel * (3 - 2 * channel);
  return baseTerrainHeight(x, z) - smoothChannel * 2.15;
}

const terrainGeometry = new THREE.PlaneGeometry(520, 520, 180, 180);
const terrainPositions = terrainGeometry.attributes.position;

for (let i = 0; i < terrainPositions.count; i++) {
  const x = terrainPositions.getX(i);
  const z = -terrainPositions.getY(i);
  terrainPositions.setZ(i, terrainHeight(x, z));
}
// Subtle vertex-colour variation breaks up the single-flat-green terrain.
const terrainColors = new Float32Array(terrainPositions.count * 3);
const meadowLow = new THREE.Color(0x536f43);
const meadowHigh = new THREE.Color(0x82965b);
const meadowPatch = new THREE.Color();
for (let i = 0; i < terrainPositions.count; i++) {
  const x = terrainPositions.getX(i);
  const z = -terrainPositions.getY(i);
  const variation = THREE.MathUtils.clamp(
    0.48 + Math.sin(x * 0.075) * 0.13 + Math.cos(z * 0.061) * 0.12
      + Math.sin((x + z) * 0.11) * 0.08,
    0, 1
  );
  meadowPatch.lerpColors(meadowLow, meadowHigh, variation);
  terrainColors[i * 3] = meadowPatch.r;
  terrainColors[i * 3 + 1] = meadowPatch.g;
  terrainColors[i * 3 + 2] = meadowPatch.b;
}
terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
terrainGeometry.computeVertexNormals();

const ground = new THREE.Mesh(
  terrainGeometry,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- Curving road whose surface follows the terrain -------------------------
function roadCenterX(z) {
  return Math.sin(z * 0.012) * 3.2;
}

function createRoad() {
  const segments = 180;
  const halfWidth = 4.4;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const z = -250 + (500 * i / segments);
    const centerX = roadCenterX(z);
    const leftX = centerX - halfWidth;
    const rightX = centerX + halfWidth;

    vertices.push(leftX, terrainHeight(leftX, z) + 0.10, z);
    vertices.push(rightX, terrainHeight(rightX, z) + 0.10, z);

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const road = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x555957,
      roughness: 0.96,
      side: THREE.DoubleSide
    })
  );
  road.receiveShadow = true;
  scene.add(road);

  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const z = -250 + (500 * i / segments);
      const x = roadCenterX(z) + side * (halfWidth - 0.22);
      points.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.16, z));
    }

    const edge = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, 0.045, 4, false),
      new THREE.MeshStandardMaterial({ color: 0xd8d2b6, roughness: 1 })
    );
    scene.add(edge);
  }
}
createRoad();

// A second, shorter road crosses the main route to make the forest feel connected.
function createCrossRoad() {
  const segments = 120;
  const halfWidth = 3.5;
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const x = -245 + (490 * i / segments);
    const centerZ = Math.sin(x * 0.014) * 5 - 28;
    const leftZ = centerZ - halfWidth;
    const rightZ = centerZ + halfWidth;
    vertices.push(x, terrainHeight(x, leftZ) + 0.12, leftZ);
    vertices.push(x, terrainHeight(x, rightZ) + 0.12, rightZ);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0x555957, roughness: 0.96, side: THREE.DoubleSide
  }));
  road.receiveShadow = true;
  scene.add(road);
}
createCrossRoad();

// A shallow winding river ribbon follows the valley, slightly below the banks.
function riverCenterX(z) {
  return 48 + Math.sin(z * 0.019) * 9 + Math.sin(z * 0.043) * 2.5;
}
function createRiver() {
  const segments = 180;
  const halfWidth = 4.8;
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const z = -250 + 500 * i / segments;
    const centerX = riverCenterX(z);
    const leftX = centerX - halfWidth;
    const rightX = centerX + halfWidth;
    // Keep the water just above the carved river bed and below its banks.
    const waterY = baseTerrainHeight(centerX, z) - 1.42;
    vertices.push(leftX, waterY, z, rightX, waterY, z);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const water = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
    color: 0x087fae,
    roughness: 0.12,
    metalness: 0.02,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    transparent: false,
    side: THREE.DoubleSide
  }));
  water.renderOrder = 2;
  water.receiveShadow = true;
  water.userData.basePositions = new Float32Array(geometry.attributes.position.array);
  scene.add(water);
  scene.userData.riverWater = water;

  // Soft sandy/pebbly banks make the water edge readable from a distance.
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const z = -250 + 500 * i / segments;
      const x = riverCenterX(z) + side * 9.7;
      points.push(new THREE.Vector3(x, baseTerrainHeight(x, z) - 0.02, z));
    }
    const bank = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, 0.42, 4, false),
      new THREE.MeshStandardMaterial({ color: 0x9a906e, roughness: 1 })
    );
    scene.add(bank);
  }
}
createRiver();

// A timber road bridge carries the crossroad over the river. The deck arches
// gently above the water and follows the crossroad's curve at both approaches.
function createRiverBridge() {
  const centerX = 48;
  const centerZ = Math.sin(centerX * 0.014) * 5 - 28;
  const halfLength = 15;
  const halfWidth = 5.35;
  const segments = 36;
  const vertices = [];
  const indices = [];
  const railLines = [[], []];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = centerX - halfLength + 2 * halfLength * t;
    const z = Math.sin(x * 0.014) * 5 - 28;
    const arch = Math.sin(Math.PI * t) * 2.55;
    const y = terrainHeight(x, z) + 0.22 + arch;
    vertices.push(x, y, z - halfWidth, x, y, z + halfWidth);
    railLines[0].push(new THREE.Vector3(x, y + 0.9, z - halfWidth));
    railLines[1].push(new THREE.Vector3(x, y + 0.9, z + halfWidth));
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const deckGeometry = new THREE.BufferGeometry();
  deckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  deckGeometry.setIndex(indices);
  deckGeometry.computeVertexNormals();
  const deck = new THREE.Mesh(deckGeometry, new THREE.MeshStandardMaterial({
    color: 0x806044, roughness: 0.92, side: THREE.DoubleSide
  }));
  deck.receiveShadow = true;
  deck.castShadow = true;
  scene.add(deck);

  // Pale timber edging and repeated short posts make the bridge visible at a distance.
  for (const rail of railLines) {
    const beam = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 48, 0.16, 5, false),
      new THREE.MeshStandardMaterial({ color: 0x493b2d, roughness: 1 })
    );
    beam.castShadow = true;
    scene.add(beam);
  }
  const postGeometry = new THREE.BoxGeometry(0.34, 1.05, 0.34);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x594532, roughness: 1 });
  const posts = new THREE.Group();
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = centerX - halfLength + 2 * halfLength * t;
    const z = Math.sin(x * 0.014) * 5 - 28;
    const y = terrainHeight(x, z) + 0.22 + Math.sin(Math.PI * t) * 2.55;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, y + 0.42, z + side * (halfWidth - 0.18));
      post.castShadow = true;
      posts.add(post);
    }
  }
  scene.add(posts);

  // Two stone piers sit beneath the outer part of the deck, clear of the channel.
  const pierMaterial = new THREE.MeshStandardMaterial({ color: 0x77796f, roughness: 1 });
  for (const x of [centerX - 11, centerX + 11]) {
    const z = Math.sin(x * 0.014) * 5 - 28;
    const top = terrainHeight(x, z) + 0.22 + Math.sin(Math.PI * ((x - centerX + halfLength) / (2 * halfLength))) * 2.55;
    const bottom = terrainHeight(x, z) - 0.3;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.8, Math.max(0.5, top - bottom), 1.8), pierMaterial);
    pier.position.set(x, (top + bottom) / 2, z);
    pier.castShadow = true;
    pier.receiveShadow = true;
    scene.add(pier);
  }
}
createRiverBridge();


// --- Soft procedural cloud layers -------------------------------------------
// Low-poly volumetric cloud banks add depth while keeping geometry inexpensive.
const cloudGroups = [];
const cloudMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4f6f4, roughness: 1, metalness: 0,
  transparent: true, opacity: 0.88, depthWrite: false
});
const cloudPuffs = [
  [0, 0, 0, 8, 3.1, 5],
  [6, 0.8, 1, 6.5, 2.7, 4.5],
  [-6, -0.2, -1.5, 6.2, 2.5, 4.2],
  [2, 1.1, -4, 5.5, 2.3, 4.0]
];
for (let i = 0; i < 16; i++) {
  const cloud = new THREE.Group();
  const scale = 0.75 + Math.random() * 1.15;
  for (const [x, y, z, sx, sy, sz] of cloudPuffs) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), cloudMaterial);
    puff.position.set(x * scale, y * scale, z * scale);
    puff.scale.set(sx * scale, sy * scale, sz * scale);
    cloud.add(puff);
  }
  cloud.position.set((Math.random() - 0.5) * 490, 58 + Math.random() * 28, (Math.random() - 0.5) * 490);
  cloud.userData.drift = 0.45 + Math.random() * 0.5;
  cloudGroups.push(cloud);
  scene.add(cloud);
}

// --- Distant rolling hills ----------------------------------------------------
const hillMaterial = new THREE.MeshStandardMaterial({
  color: 0x82977b,
  roughness: 1
});

for (let i = 0; i < 20; i++) {
  const radius = 18 + Math.random() * 22;
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 14, 10),
    hillMaterial
  );
  const angle = (i / 20) * Math.PI * 2;
  const distance = 225 + Math.random() * 45;
  hill.position.set(
    Math.cos(angle) * distance,
    -radius * 0.54,
    Math.sin(angle) * distance
  );
  hill.scale.y = 0.52;
  hill.receiveShadow = true;
  scene.add(hill);
}

// --- Diverse, performance-conscious forest ----------------------------------
// A more open forest: fewer trees, varied silhouettes, natural colour variation,
// and occasional tall-trunk trees. All trees are instanced for low draw-call cost.
const TREE_COUNT = 5600;
const TREE_CELL_SIZE = 12;
const treeCollisionGrid = new Map();
const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x60432f, roughness: 1 });
const spruceLeafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x174536, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x245b45, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x356b4d, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x456f4d, roughness: 1 })
];
const broadleafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x527d42, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x668b49, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x789653, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x3e7044, roughness: 1 })
];
const tallTreeMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x315b3d, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x477348, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x5c8148, roughness: 1 })
];

// A flared, gently tapered trunk silhouette reads more like a real tree than a tube.
const standardTrunkGeometry = new THREE.LatheGeometry([
  new THREE.Vector2(0.38, 0.0),
  new THREE.Vector2(0.31, 0.22),
  new THREE.Vector2(0.25, 0.85),
  new THREE.Vector2(0.21, 1.75),
  new THREE.Vector2(0.17, 2.55),
  new THREE.Vector2(0.13, 3.2)
], 8);
const spruceCrownGeometries = [
  new THREE.ConeGeometry(2.65, 5.0, 7),
  new THREE.ConeGeometry(2.15, 4.5, 7),
  new THREE.ConeGeometry(1.6, 3.9, 7)
];
const broadleafCrownGeometry = new THREE.SphereGeometry(2.35, 8, 7);
const tallCrownGeometry = new THREE.ConeGeometry(2.35, 7.2, 7);
const oakClusterGeometry = new THREE.SphereGeometry(1.55, 7, 6);

const spruceTrunks = new THREE.InstancedMesh(standardTrunkGeometry, treeTrunkMaterial, TREE_COUNT);
const broadleafTrunks = new THREE.InstancedMesh(standardTrunkGeometry, treeTrunkMaterial, TREE_COUNT);
const tallTrunks = new THREE.InstancedMesh(standardTrunkGeometry, treeTrunkMaterial, TREE_COUNT);
const spruceCrowns = spruceCrownGeometries.map(geometry =>
  new THREE.InstancedMesh(geometry, spruceLeafMaterials[0], TREE_COUNT)
);
const broadleafCrown = new THREE.InstancedMesh(broadleafCrownGeometry, broadleafMaterials[0], TREE_COUNT);
const broadleafClusters = new THREE.InstancedMesh(oakClusterGeometry, broadleafMaterials[0], TREE_COUNT * 3);
const tallCrown = new THREE.InstancedMesh(tallCrownGeometry, tallTreeMaterials[0], TREE_COUNT);
const allTreeMeshes = [
  spruceTrunks, broadleafTrunks, tallTrunks,
  ...spruceCrowns, broadleafCrown, broadleafClusters, tallCrown
];
allTreeMeshes.forEach(mesh => {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
});

const treeDummy = new THREE.Object3D();
const reservedVillageZones = [
  { x: -42, z: -76 }, { x: 112, z: 82 }, { x: -96, z: 42 }
];

// Keep forest placement clear of every dirt lane, not just the two main roads.
// Sample the same curved paths used to build the village lanes.
const eastCrossZ = Math.sin(112 * 0.014) * 5 - 28;
const villageLanePaths = [
  [[-42, -53], [-24.36, -50], [roadCenterX(-53) - 3, -52], [roadCenterX(-53), -53]],
  [[112, 59], [120, 18], [116, eastCrossZ + 10], [112, eastCrossZ]],
  [[-96, 19], [-55.68, 22], [roadCenterX(19) - 3, 20], [roadCenterX(19), 19]]
].map(points => new THREE.CatmullRomCurve3(points.map(([px, pz]) => new THREE.Vector3(px, 0, pz))));

function distanceToSegment2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0
    ? THREE.MathUtils.clamp(((px - ax) * dx + (pz - az) * dz) / lengthSq, 0, 1)
    : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function nearVillageLane(x, z, clearance = 9.5) {
  for (const curve of villageLanePaths) {
    let previous = curve.getPoint(0);
    for (let i = 1; i <= 48; i++) {
      const next = curve.getPoint(i / 48);
      if (distanceToSegment2D(x, z, previous.x, previous.z, next.x, next.z) < clearance) return true;
      previous = next;
    }
  }
  return false;
}
const speciesCounts = [0, 0, 0];
const treeRecords = [];
let placedTrees = 0;
let attempts = 0;

while (placedTrees < TREE_COUNT && attempts < TREE_COUNT * 15) {
  attempts++;
  const x = (Math.random() - 0.5) * 480;
  const z = (Math.random() - 0.5) * 480;
  // A generous shoulder keeps trunks and overhanging crowns out of road space.
  if (Math.abs(x - roadCenterX(z)) < 13.5) continue;
  if (Math.abs(z - (Math.sin(x * 0.014) * 5 - 28)) < 12) continue;
  if (nearVillageLane(x, z, 10.5)) continue;
  if (Math.abs(x - riverCenterX(z)) < 13) continue;
  if (reservedVillageZones.some(v => Math.hypot(x - v.x, z - v.z) < 39)) continue;

  // 48% spruce, 34% broadleaf, 18% tall-trunk woodland trees.
  const roll = Math.random();
  const species = roll < 0.48 ? 0 : roll < 0.82 ? 1 : 2;
  const index = speciesCounts[species]++;
  const scale = species === 1
    ? 1.0 + Math.random() * 0.65
    : 1.15 + Math.random() * 0.75;
  const rotation = Math.random() * Math.PI * 2;
  const groundY = terrainHeight(x, z);
  // A portion of the woodland has short, low branching trunks.
  const shortTrunk = Math.random() < 0.26;
  const trunkLength = shortTrunk
    ? 1.6 + Math.random() * 1.2
    : species === 2
      ? 7.0 + Math.random() * 5.0
      : species === 1
        ? 3.8 + Math.random() * 2.0
        : 3.2 + Math.random() * 1.3;
  const trunkRadius = species === 2 ? 0.72 : species === 1 ? 0.58 : 0.46;

  // Scale trunk height independently so some trees have visibly long bare trunks.
  // LatheGeometry starts at local y=0, so its base must sit exactly on the ground.
  // The old half-height offset lifted every trunk above the terrain.
  treeDummy.position.set(x, groundY, z);
  treeDummy.rotation.set(0, rotation, 0);
  treeDummy.scale.set(trunkRadius * scale, (trunkLength / 3.2) * scale, trunkRadius * scale);
  treeDummy.updateMatrix();
  const trunkMesh = species === 0 ? spruceTrunks : species === 1 ? broadleafTrunks : tallTrunks;
  trunkMesh.setMatrixAt(index, treeDummy.matrix);

  if (species === 0) {
    for (let tier = 0; tier < 3; tier++) {
      treeDummy.position.set(x, groundY + (trunkLength + 2.4 + tier * 1.75) * scale, z);
      treeDummy.rotation.set(0, rotation, 0);
      treeDummy.scale.setScalar(scale);
      treeDummy.updateMatrix();
      spruceCrowns[tier].setMatrixAt(index, treeDummy.matrix);
      const spruceTint = new THREE.Color([0x174536, 0x245b45, 0x356b4d, 0x456f4d][Math.floor(Math.random() * 4)]);
      spruceCrowns[tier].setColorAt(index, spruceTint);
    }
  } else if (species === 1) {
    const crownY = groundY + (trunkLength + 1.7) * scale;
    treeDummy.position.set(x, crownY, z);
    treeDummy.rotation.set(0, rotation, 0);
    treeDummy.scale.setScalar(scale * 1.15);
    treeDummy.updateMatrix();
    broadleafCrown.setMatrixAt(index, treeDummy.matrix);
    broadleafCrown.setColorAt(index, new THREE.Color([0x527d42, 0x668b49, 0x789653, 0x3e7044][Math.floor(Math.random() * 4)]));
    // Three overlapping leaf clusters make broadleaf crowns less spherical.
    for (let cluster = 0; cluster < 3; cluster++) {
      const angle = rotation + cluster * Math.PI * 2 / 3;
      treeDummy.position.set(
        x + Math.cos(angle) * 1.25 * scale,
        crownY + (cluster === 1 ? 0.45 : -0.15) * scale,
        z + Math.sin(angle) * 1.25 * scale
      );
      treeDummy.scale.setScalar(scale * 0.78);
      treeDummy.updateMatrix();
      broadleafClusters.setMatrixAt(index * 3 + cluster, treeDummy.matrix);
      broadleafClusters.setColorAt(index * 3 + cluster, new THREE.Color([0x527d42, 0x668b49, 0x789653, 0x3e7044][Math.floor(Math.random() * 4)]));
    }
  } else {
    treeDummy.position.set(x, groundY + (trunkLength + 3.4) * scale, z);
    treeDummy.rotation.set(0, rotation, 0);
    treeDummy.scale.set(scale * 1.2, scale * 1.05, scale * 1.2);
    treeDummy.updateMatrix();
    tallCrown.setMatrixAt(index, treeDummy.matrix);
    tallCrown.setColorAt(index, new THREE.Color([0x315b3d, 0x477348, 0x5c8148][Math.floor(Math.random() * 3)]));
  }

  const cellX = Math.floor(x / TREE_CELL_SIZE);
  const cellZ = Math.floor(z / TREE_CELL_SIZE);
  const cellKey = cellX + ',' + cellZ;
  if (!treeCollisionGrid.has(cellKey)) treeCollisionGrid.set(cellKey, []);
  treeCollisionGrid.get(cellKey).push({
    x, z,
    radius: Math.max(0.62, trunkRadius * scale + 0.42)
  });
  treeRecords.push({
    x, z, groundY, rotation, species, index,
    modelScale: 0.82 + Math.random() * 0.34,
    proxyRefs: [],
    modelHidden: false
  });
  placedTrees++;
}

spruceTrunks.count = speciesCounts[0];
broadleafTrunks.count = speciesCounts[1];
tallTrunks.count = speciesCounts[2];
spruceCrowns.forEach(mesh => { mesh.count = speciesCounts[0]; });
broadleafCrown.count = speciesCounts[1];
broadleafClusters.count = speciesCounts[1] * 3;
tallCrown.count = speciesCounts[2];
allTreeMeshes.forEach(mesh => {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
});

// --- Real tree models with near/far LOD --------------------------------------
// The original instanced trees remain the inexpensive distant LOD. Up close,
// a small pool of real GLB trees is instanced and the matching proxy is hidden.
const TREE_MODEL_URLS = [
  'https://files.innerscene.com/library/mature-norway-spruce-tree-48c2566f/a285b3017c941e802efc/mature-norway-spruce-tree.glb',
  'https://files.innerscene.com/library/oak-street-tree-detailed-leaves-a273fef9/4a26d0fea7474835bf61/oak-detailed.glb',
  'https://files.innerscene.com/library/mature-silver-birch-tree-8e297753/aa07a142ddd1cb8e3cfc/mature-silver-birch-tree.glb'
];
const TREE_MODEL_HEIGHTS = [15.5, 8.5, 13.5];
const TREE_MODEL_POOL_SIZE = 30;
const TREE_MODEL_DISTANCE = 76;
const detailedTreeAssets = new Map();
const zeroTreeMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

function getTreeProxyRefs(record) {
  if (record.species === 0) {
    return [spruceTrunks, ...spruceCrowns].map(mesh => ({ mesh, index: record.index }));
  }
  if (record.species === 1) {
    return [
      { mesh: broadleafTrunks, index: record.index },
      { mesh: broadleafCrown, index: record.index },
      ...[0, 1, 2].map(offset => ({ mesh: broadleafClusters, index: record.index * 3 + offset }))
    ];
  }
  return [
    { mesh: tallTrunks, index: record.index },
    { mesh: tallCrown, index: record.index }
  ];
}

for (const record of treeRecords) {
  record.proxyRefs = getTreeProxyRefs(record).map(ref => ({
    ...ref,
    original: ref.mesh.instanceMatrix.array.slice(ref.index * 16, ref.index * 16 + 16)
  }));
}

function setTreeProxyHidden(record, hidden) {
  if (record.modelHidden === hidden) return;
  const matrix = new THREE.Matrix4();
  for (const ref of record.proxyRefs) {
    if (hidden) {
      ref.mesh.setMatrixAt(ref.index, zeroTreeMatrix);
    } else {
      matrix.fromArray(ref.original);
      ref.mesh.setMatrixAt(ref.index, matrix);
    }
    ref.mesh.instanceMatrix.needsUpdate = true;
  }
  record.modelHidden = hidden;
}

async function loadDetailedTreeAsset(species, url, targetHeight) {
  try {
    const gltf = await loadGLTF(url);
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Tree model has invalid dimensions');

    const center = bounds.getCenter(new THREE.Vector3());
    const fitScale = targetHeight / size.y;
    const normalize = new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z);
    normalize.premultiply(new THREE.Matrix4().makeScale(fitScale, fitScale, fitScale));
    const meshes = [];

    root.traverse(child => {
      if (!child.isMesh || !child.geometry || !child.material) return;
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      geometry.applyMatrix4(normalize);
      geometry.computeBoundingSphere();
      const instanced = new THREE.InstancedMesh(
        geometry,
        child.material,
        TREE_MODEL_POOL_SIZE
      );
      instanced.count = 0;
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instanced.castShadow = false;
      instanced.receiveShadow = false;
      instanced.frustumCulled = false;
      scene.add(instanced);
      meshes.push(instanced);
    });

    if (!meshes.length) throw new Error('Tree GLB contains no mesh objects');
    detailedTreeAssets.set(species, { meshes, active: [] });
  } catch (error) {
    console.error('Tree GLB failed to load. Keeping lightweight forest proxies. Check the model URL/network/CORS:', url, error);
  }
}

Promise.all(TREE_MODEL_URLS.map((url, species) =>
  loadDetailedTreeAsset(species, url, TREE_MODEL_HEIGHTS[species])
)).then(() => {
  updateDetailedTreeLODs();
});

let nextTreeLodUpdate = 0;
function updateDetailedTreeLODs() {
  const playerX = player.position.x;
  const playerZ = player.position.z;
  for (const [species, asset] of detailedTreeAssets) {
    const candidates = treeRecords
      .filter(record => record.species === species)
      .map(record => ({
        record,
        distanceSq: (record.x - playerX) ** 2 + (record.z - playerZ) ** 2
      }))
      .filter(item => item.distanceSq < TREE_MODEL_DISTANCE * TREE_MODEL_DISTANCE)
      .sort((a, b) => a.distanceSq - b.distanceSq)
      .slice(0, TREE_MODEL_POOL_SIZE)
      .map(item => item.record);

    const selected = new Set(candidates);
    for (const previous of asset.active) {
      if (!selected.has(previous)) setTreeProxyHidden(previous, false);
    }
    const dummy = new THREE.Object3D();
    candidates.forEach((record, index) => {
      setTreeProxyHidden(record, true);
      dummy.position.set(record.x, record.groundY, record.z);
      dummy.rotation.set(0, record.rotation, 0);
      dummy.scale.setScalar(record.modelScale);
      dummy.updateMatrix();
      for (const mesh of asset.meshes) mesh.setMatrixAt(index, dummy.matrix);
    });
    for (const mesh of asset.meshes) {
      mesh.count = candidates.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
    asset.active = candidates;
  }
}

// Load the three approved tree species. The procedural instances above remain
// visible until each corresponding real model has loaded successfully.

// Instanced grass keeps draw calls low.
const grassGeometry = new THREE.ConeGeometry(0.13, 0.65, 4);
const grassMaterial = new THREE.MeshStandardMaterial({
  color: 0x78965a,
  roughness: 1
});
const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 2200);
const grassDummy = new THREE.Object3D();
let grassIndex = 0;

for (let i = 0; i < 2200; i++) {
  const x = (Math.random() - 0.5) * 480;
  const z = (Math.random() - 0.5) * 480;
  if (Math.abs(x - roadCenterX(z)) < 6) continue;

  grassDummy.position.set(x, terrainHeight(x, z) + 0.28, z);
  grassDummy.rotation.set(0, Math.random() * Math.PI, 0);
  const scale = 0.5 + Math.random() * 0.8;
  grassDummy.scale.set(scale, scale, scale);
  grassDummy.updateMatrix();
  grass.setMatrixAt(grassIndex, grassDummy.matrix);
  grass.setColorAt(grassIndex, new THREE.Color([0x718c4c, 0x8aa45a, 0x607c42, 0x9ba85e][Math.floor(Math.random() * 4)]));
  grassIndex++;
}

grass.count = grassIndex;
scene.add(grass);

// --- Forest floor: shrubs, ferns, flowers and fallen logs --------------------
// Instanced meshes add undergrowth variety without thousands of separate draw calls.
const undergrowth = [
  { geometry: new THREE.IcosahedronGeometry(0.9, 1), color: 0x456b3c, count: 1050, min: 0.55, max: 1.25 },
  { geometry: new THREE.SphereGeometry(0.72, 7, 5), color: 0x78934a, count: 780, min: 0.45, max: 1.15 },
  { geometry: new THREE.ConeGeometry(0.42, 1.5, 5), color: 0x4f7b48, count: 900, min: 0.55, max: 1.2 },
  { geometry: new THREE.ConeGeometry(0.16, 0.9, 5), color: 0xd6bd72, count: 260, min: 0.55, max: 1.0 },
  { geometry: new THREE.ConeGeometry(0.15, 0.82, 5), color: 0xc77d68, count: 210, min: 0.55, max: 1.0 }
];
const plantMeshes = undergrowth.map((plant, index) => {
  const material = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 1 });
  const mesh = new THREE.InstancedMesh(plant.geometry, material, plant.count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const dummy = new THREE.Object3D();
  let placed = 0;
  let tries = 0;
  while (placed < plant.count && tries < plant.count * 12) {
    tries++;
    const x = (Math.random() - 0.5) * 475;
    const z = (Math.random() - 0.5) * 475;
    if (Math.abs(x - roadCenterX(z)) < 8) continue;
    if (Math.abs(z - (Math.sin(x * 0.014) * 5 - 28)) < 7) continue;
    if (Math.abs(x - riverCenterX(z)) < 11) continue;
    if (reservedVillageZones.some(v => Math.hypot(x - v.x, z - v.z) < 29)) continue;
    // Keep some clearings so the forest floor remains readable.
    if (Math.random() < 0.12) continue;
    const scale = plant.min + Math.random() * (plant.max - plant.min);
    dummy.position.set(x, terrainHeight(x, z) + 0.28 * scale, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.12);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed++, dummy.matrix);
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
});

// --- Small roadside villages -------------------------------------------------
const wallMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xd9c39c, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0xc6b18f, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0xb9c8b8, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0xd6a98a, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0xb8c5d3, roughness: 1 })
];
const roofMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x70463a, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x4d5354, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x8a5939, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x526c57, roughness: 1 })
];
const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0x83b7c6, roughness: 0.3, metalness: 0.05
});
const doorMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x533c2c, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x344b55, roughness: 1 })
];

const houseColliders = [];
const HOUSE_MODEL_URLS = [
  'https://grab3d.com/dl/bungalow/bungalow.glb',
  'https://grab3d.com/dl/stone-house/stone-house.glb',
  'https://grab3d.com/dl/modern-house/modern-house.glb'
];

async function replaceHouseWithGLB(house, style, collider, width, depth, wallHeight, outerScale) {
  try {
    const gltf = await loadGLTF(HOUSE_MODEL_URLS[Math.abs(style) % HOUSE_MODEL_URLS.length]);
    const model = gltf.scene.clone(true);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('House model has invalid dimensions');

    // Fit each downloaded model inside the existing village footprint.
    const targetHeight = wallHeight + 2.8;
    const fitScale = Math.min(
      (width * 1.25) / size.x,
      (depth * 1.25) / size.z,
      targetHeight / size.y
    );
    const center = bounds.getCenter(new THREE.Vector3());
    model.scale.setScalar(fitScale);
    model.position.set(-center.x * fitScale, -bounds.min.y * fitScale, -center.z * fitScale);
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Remove the procedural placeholder only after the GLB is ready.
    while (house.children.length) {
      const child = house.children[0];
      house.remove(child);
      child.traverse(object => {
        if (object.geometry) object.geometry.dispose();
      });
    }
    house.add(model);
    collider.halfWidth = size.x * fitScale * outerScale / 2 + 0.55;
    collider.halfDepth = size.z * fitScale * outerScale / 2 + 0.55;
  } catch (error) {
    console.error('House GLB failed to load. Keeping procedural fallback. Check the model URL/network/CORS:', HOUSE_MODEL_URLS[Math.abs(style) % HOUSE_MODEL_URLS.length], error);
  }
}

function createHouse(x, z, scale = 1, style = 0) {
  const house = new THREE.Group();
  const wallMaterial = wallMaterials[style % wallMaterials.length];
  const roofMaterial = roofMaterials[style % roofMaterials.length];
  const width = style % 3 === 0 ? 7.4 : style % 3 === 1 ? 6.3 : 8.2;
  const depth = style % 2 === 0 ? 6.4 : 7.2;
  const wallHeight = style % 3 === 2 ? 5.0 : 4.1;

  // Raised stone foundation and corner posts give each home a finished silhouette.
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.42, 0.48, depth + 0.42),
    new THREE.MeshStandardMaterial({ color: 0x77766a, roughness: 1 })
  );
  foundation.position.y = 0.24;
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  house.add(foundation);

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(width, wallHeight, depth),
    wallMaterial
  );
  walls.position.y = wallHeight / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  house.add(walls);

  if (style % 4 === 1) {
    // A second storey creates a taller two-level village home.
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.76, 2.4, depth * 0.76),
      wallMaterial
    );
    upper.position.set(0, wallHeight + 1.2, -0.15);
    upper.castShadow = true;
    house.add(upper);
  }

  if (style % 4 === 2) {
    // Flat-roof modern home with a raised parapet.
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.65, 0.42, depth + 0.65),
      roofMaterial
    );
    roof.position.y = wallHeight + 0.22;
    roof.castShadow = true;
    house.add(roof);
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.72, 0.7, depth * 0.72),
      wallMaterial
    );
    parapet.position.set(0, wallHeight + 0.72, -0.1);
    house.add(parapet);
  } else {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(width * 0.72, style % 4 === 1 ? 3.4 : 3.0, 4),
      roofMaterial
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = wallHeight + 1.45;
    roof.scale.set(1, 1, depth / width);
    roof.castShadow = true;
    house.add(roof);
  }

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 2.35, 0.14),
    doorMaterials[style % doorMaterials.length]
  );
  door.position.set(0, 1.17, depth / 2 + 0.08);
  house.add(door);
  const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xc6a65c, metalness: 0.55, roughness: 0.35 }));
  doorKnob.position.set(0.36, 1.18, depth / 2 + 0.17);
  house.add(doorKnob);

  for (const side of [-1, 1]) {
    const windowX = side * width * 0.29;
    const windowY = wallHeight * 0.57;
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 0.12), windowMaterial);
    windowMesh.position.set(windowX, windowY, depth / 2 + 0.09);
    house.add(windowMesh);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xe4d8bd, roughness: 0.9 });
    for (const [dx, dy, w, h] of [[0, 0.57, 1.42, 0.12], [0, -0.57, 1.42, 0.12], [-0.65, 0, 0.12, 1.2], [0.65, 0, 0.12, 1.2], [0, 0, 0.07, 1.0]]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), frameMaterial);
      frame.position.set(windowX + dx, windowY + dy, depth / 2 + 0.17);
      house.add(frame);
    }
  }

  // A shallow doorstep and visible lintel detail make entrances easier to read.
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x9b927f, roughness: 1 }));
  step.position.set(0, 0.11, depth / 2 + 0.42);
  house.add(step);

  if (style % 3 === 0) {
    // Covered porch and two support posts.
    const porchRoof = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.72, 0.24, 2.0),
      roofMaterial
    );
    porchRoof.position.set(0, 3.0, depth / 2 + 1.0);
    house.add(porchRoof);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.9, 0.18), doorMaterials[0]);
      post.position.set(side * width * 0.31, 1.45, depth / 2 + 1.7);
      house.add(post);
    }
  }

  if (style % 3 === 1) {
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 2.5, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x80594b, roughness: 1 })
    );
    chimney.position.set(width * 0.28, wallHeight + 2.0, -depth * 0.2);
    house.add(chimney);
  }

  house.scale.setScalar(scale);
  house.position.set(x, terrainHeight(x, z), z);
  const houseRotation = (Math.random() - 0.5) * 0.35;
  house.rotation.y = houseRotation;
  scene.add(house);
  // Oriented rectangular footprint closely follows the actual building walls.
  // A small player-radius margin prevents the character clipping the corners.
  const collider = {
    x, z, rotation: houseRotation,
    halfWidth: width * scale / 2 + 0.48,
    halfDepth: depth * scale / 2 + 0.48
  };
  houseColliders.push(collider);
  replaceHouseWithGLB(house, style, collider, width, depth, wallHeight, scale);

  const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7759, roughness: 1 });
  for (const side of [-1, 1]) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 10 * scale), fenceMaterial);
    fence.position.set(x + side * (width * 0.72) * scale, terrainHeight(x + side * (width * 0.72) * scale, z), z - 1.5);
    fence.castShadow = true;
    scene.add(fence);
  }
}

const villageGroups = [
  { x: -42, z: -76 },
  { x: 112, z: 82 },
  { x: -96, z: 42 }
];

// Dirt-and-gravel lanes branch from the main/cross road and lead right into
// each settlement. The eastern village joins the crossroad on the far bank.
function createVillageLane(points, width = 5.8) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) =>
    new THREE.Vector3(x, 0, z)
  ));
  const segments = 64;
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const sideX = -tangent.z;
    const sideZ = tangent.x;
    for (const side of [-1, 1]) {
      const x = point.x + sideX * width * 0.5 * side;
      const z = point.z + sideZ * width * 0.5 * side;
      vertices.push(x, terrainHeight(x, z) + 0.15, z);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const lane = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0x82765d, roughness: 1, side: THREE.DoubleSide
  }));
  lane.receiveShadow = true;
  scene.add(lane);

  // Narrow gravel shoulders soften the road edge.
  for (const side of [-1, 1]) {
    const edgePoints = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const x = point.x - tangent.z * (width * 0.5 + 0.12) * side;
      const z = point.z + tangent.x * (width * 0.5 + 0.12) * side;
      edgePoints.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.18, z));
    }
    const edge = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints), segments, 0.055, 4, false),
      new THREE.MeshStandardMaterial({ color: 0xb2a184, roughness: 1 })
    );
    scene.add(edge);
  }
}

villageLanePaths.forEach(curve => {
  createVillageLane(curve.points.map(point => [point.x, point.z]));
});
villageGroups.forEach((village, groupIndex) => {
  const placements = [
    [-10, -7, 1.18], [10, -9, 1.08], [-13, 9, 1.12],
    [12, 9, 1.22], [0, 17, 0.96]
  ];
  placements.forEach(([dx, dz, scale], index) => {
    createHouse(village.x + dx, village.z + dz, scale, groupIndex + index);
  });
});

// --- Village residents --------------------------------------------------------
const villagers = [];
const villagerCoats = [
  new THREE.MeshStandardMaterial({ color: 0x9b5140, roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x3d7180, roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x8b7842, roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x66527f, roughness: 0.95 })
];
const villagerSkin = new THREE.MeshStandardMaterial({ color: 0xb98262, roughness: 1 });
const villagerLegs = new THREE.MeshStandardMaterial({ color: 0x30383a, roughness: 1 });

function createVillager(x, z, index) {
  const person = new THREE.Group();
  const coat = villagerCoats[index % villagerCoats.length];
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.48, 3, 7), coat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  person.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), villagerSkin);
  head.position.y = 1.78;
  head.castShadow = true;
  person.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.48),
    new THREE.MeshStandardMaterial({ color: index % 2 ? 0x332b27 : 0x514033, roughness: 1 })
  );
  hair.position.y = 1.84;
  person.add(hair);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.13, 0.76, 0);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.48, 3, 6), villagerLegs);
    limb.position.y = -0.28;
    limb.castShadow = true;
    leg.add(limb);
    person.add(leg);
    legs.push(leg);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 1.38, 0);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.4, 3, 6), coat);
    limb.position.y = -0.25;
    arm.add(limb);
    person.add(arm);
    arms.push(arm);
  }
  person.position.set(x, terrainHeight(x, z), z);
  scene.add(person);
  villagers.push({ person, legs, arms, originX: x, originZ: z, phase: index * 1.7 });
}

villageGroups.forEach((village, groupIndex) => {
  for (let i = 0; i < 3; i++) {
    createVillager(village.x + (i - 1) * 7, village.z + 22 + (i % 2) * 3, groupIndex * 3 + i);
  }
});

// --- Low-poly cars travelling along the main road ---------------------------
function createCar(color) {
  const car = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.18 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x18313d, roughness: 0.18, metalness: 0.16
  });
  const tyreMaterial = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 1 });
  const chromeMaterial = new THREE.MeshStandardMaterial({ color: 0xb8c4c8, metalness: 0.75, roughness: 0.28 });
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: 0xffefc2, emissive: 0x8a6528, roughness: 0.25
  });

  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.72, 4.35), bodyMaterial);
  lowerBody.position.y = 0.82;
  lowerBody.castShadow = true;
  car.add(lowerBody);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 1.25), bodyMaterial);
  hood.position.set(0, 1.16, 1.42);
  car.add(hood);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.28, 0.85), bodyMaterial);
  boot.position.set(0, 1.13, -1.72);
  car.add(boot);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.92, 2.15), bodyMaterial);
  cabin.position.set(0, 1.55, -0.22);
  cabin.castShadow = true;
  car.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.68, 0.08), glassMaterial);
  windshield.position.set(0, 1.63, 0.88);
  windshield.rotation.x = -0.24;
  car.add(windshield);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 0.08), glassMaterial);
  rearGlass.position.set(0, 1.62, -1.28);
  rearGlass.rotation.x = 0.22;
  car.add(rearGlass);
  for (const side of [-1, 1]) {
    const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 1.35), glassMaterial);
    sideWindow.position.set(side * 0.87, 1.62, -0.2);
    car.add(sideWindow);
  }

  // Mirrors, door handles and side rubbing strips add recognisable car details.
  const mirrorMaterial = new THREE.MeshStandardMaterial({ color: 0x252d30, roughness: 0.42 });
  for (const side of [-1, 1]) {
    const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.24), chromeMaterial);
    mirrorStem.position.set(side * 1.02, 1.53, 0.68);
    car.add(mirrorStem);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.28), mirrorMaterial);
    mirror.position.set(side * 1.1, 1.61, 0.72);
    car.add(mirror);
    for (const z of [-0.72, 0.18]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.32), chromeMaterial);
      handle.position.set(side * 0.91, 1.23, z);
      car.add(handle);
    }
    const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 2.65), chromeMaterial);
    sideTrim.position.set(side * 1.13, 0.78, -0.12);
    car.add(sideTrim);
  }

  const wheels = [];
  for (const x of [-1.13, 1.13]) {
    for (const z of [-1.38, 1.38]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.28, 12), tyreMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.48, z);
      wheel.castShadow = true;
      car.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.295, 10), chromeMaterial);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      car.add(hub);
      wheels.push(wheel);
    }
  }

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.18, 0.16), chromeMaterial);
  frontBumper.position.set(0, 0.55, 2.2);
  car.add(frontBumper);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.06), new THREE.MeshStandardMaterial({ color: 0x20282b, roughness: 0.95 }));
  grille.position.set(0, 0.83, 2.2);
  car.add(grille);
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.035), chromeMaterial);
    slat.position.set(0, 0.75 + i * 0.055, 2.24);
    car.add(slat);
  }
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.16, 0.14), chromeMaterial);
  rearBumper.position.set(0, 0.55, -2.2);
  car.add(rearBumper);

  for (const x of [-0.76, 0.76]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.23, 0.08), lampMaterial);
    headlight.position.set(x, 1.02, 2.2);
    car.add(headlight);
    const tailLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.22, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xc62d27, emissive: 0x3b0907 })
    );
    tailLight.position.set(x, 0.98, -2.2);
    car.add(tailLight);
  }
  return { car, wheels };
}

const traffic = [];
[0xffbd55, 0xd94d43, 0x477eae, 0xe2e1d8].forEach((color, index) => {
  const vehicle = createCar(color);
  vehicle.car.scale.setScalar(0.92);
  scene.add(vehicle.car);
  traffic.push({
    ...vehicle,
    z: -118 + index * 62,
    speed: 5.5 + index * 0.8,
    lane: index % 2 === 0 ? -1.35 : 1.35
  });
});


// --- Procedural third-person character ---------------------------------------
// This is a lightweight placeholder model. A rigged GLB character can replace
// it later for professional animation and more detailed clothing.
const player = new THREE.Group();
const character = new THREE.Group();
player.add(character);

const jacket = new THREE.MeshStandardMaterial({ color: 0x344b60, roughness: 0.88 });
const trousers = new THREE.MeshStandardMaterial({ color: 0x303638, roughness: 0.95 });
const skin = new THREE.MeshStandardMaterial({ color: 0xc58e6b, roughness: 0.9 });
const dark = new THREE.MeshStandardMaterial({ color: 0x20282b, roughness: 0.95 });
const boots = new THREE.MeshStandardMaterial({ color: 0x292724, roughness: 1 });

function addPart(parent, geometry, material, position) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Torso, neck, head and cap.
addPart(character, new THREE.CapsuleGeometry(0.39, 0.62, 4, 8), jacket, [0, 1.32, 0]);
addPart(character, new THREE.CylinderGeometry(0.12, 0.13, 0.18, 8), skin, [0, 1.86, 0]);
addPart(character, new THREE.SphereGeometry(0.29, 14, 12), skin, [0, 2.13, 0]);
// Small facial features and a cap brim make the player model less mannequin-like.
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x202326, roughness: 0.6 });
for (const side of [-1, 1]) {
  addPart(character, new THREE.SphereGeometry(0.035, 8, 6), eyeMaterial, [side * 0.105, 2.16, 0.267]);
}
addPart(character, new THREE.SphereGeometry(0.045, 8, 6), skin, [0, 2.08, 0.29]);
addPart(character, new THREE.BoxGeometry(0.36, 0.055, 0.18), dark, [0, 2.19, 0.25]);
addPart(
  character,
  new THREE.SphereGeometry(0.30, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48),
  dark,
  [0, 2.22, 0.015]
);
addPart(character, new THREE.BoxGeometry(0.48, 0.62, 0.22), dark, [0, 1.38, 0.34]);

const leftArm = new THREE.Group();
leftArm.position.set(-0.48, 1.58, 0);
character.add(leftArm);
addPart(leftArm, new THREE.CapsuleGeometry(0.115, 0.48, 3, 6), jacket, [0, -0.31, 0]);
addPart(leftArm, new THREE.SphereGeometry(0.12, 8, 8), skin, [0, -0.63, 0]);

const rightArm = new THREE.Group();
rightArm.position.set(0.48, 1.58, 0);
character.add(rightArm);
addPart(rightArm, new THREE.CapsuleGeometry(0.115, 0.48, 3, 6), jacket, [0, -0.31, 0]);
addPart(rightArm, new THREE.SphereGeometry(0.12, 8, 8), skin, [0, -0.63, 0]);

const leftLeg = new THREE.Group();
leftLeg.position.set(-0.19, 0.83, 0);
character.add(leftLeg);
addPart(leftLeg, new THREE.CapsuleGeometry(0.15, 0.52, 3, 6), trousers, [0, -0.31, 0]);
addPart(leftLeg, new THREE.BoxGeometry(0.25, 0.14, 0.42), boots, [0, -0.67, -0.08]);

const rightLeg = new THREE.Group();
rightLeg.position.set(0.19, 0.83, 0);
character.add(rightLeg);
addPart(rightLeg, new THREE.CapsuleGeometry(0.15, 0.52, 3, 6), trousers, [0, -0.31, 0]);
addPart(rightLeg, new THREE.BoxGeometry(0.25, 0.14, 0.42), boots, [0, -0.67, -0.08]);

player.position.set(0, terrainHeight(0, 12), 12);
scene.add(player);

// --- Keyboard and camera controls --------------------------------------------
const keys = {};
addEventListener('keydown', (event) => {
  keys[event.code] = true;
});
addEventListener('keyup', (event) => {
  keys[event.code] = false;
});
addEventListener('blur', () => {
  for (const key in keys) keys[key] = false;
});

let yaw = 0;
let dragging = false;
let lastPointerX = 0;

renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastPointerX = event.clientX;
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointerup', () => {
  dragging = false;
});
renderer.domElement.addEventListener('pointercancel', () => {
  dragging = false;
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  yaw -= (event.clientX - lastPointerX) * 0.005;
  lastPointerX = event.clientX;
});

const clock = new THREE.Clock();
const cameraOffset = new THREE.Vector3(0, 5.0, 9.4);
const cameraTarget = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
const velocity = new THREE.Vector3();
const desiredVelocity = new THREE.Vector3();
let walkTime = 0;
let characterYaw = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const inputDirection = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp) inputDirection.addScaledVector(forward, -1);
  if (keys.KeyS || keys.ArrowDown) inputDirection.addScaledVector(forward, 1);
  if (keys.KeyA || keys.ArrowLeft) inputDirection.addScaledVector(right, -1);
  if (keys.KeyD || keys.ArrowRight) inputDirection.addScaledVector(right, 1);

  const running = keys.ShiftLeft || keys.ShiftRight;
  const maxSpeed = running ? 12.5 : 6.2;
  if (inputDirection.lengthSq() > 0) {
    inputDirection.normalize();
    desiredVelocity.copy(inputDirection).multiplyScalar(maxSpeed);
  } else {
    desiredVelocity.set(0, 0, 0);
  }

  // Smooth acceleration and braking instead of instantly changing position.
  const response = inputDirection.lengthSq() > 0 ? 7.5 : 10.5;
  velocity.lerp(desiredVelocity, 1 - Math.exp(-response * dt));
  const previousX = player.position.x;
  const previousZ = player.position.z;
  const nextX = THREE.MathUtils.clamp(previousX + velocity.x * dt, -245, 245);
  const nextZ = THREE.MathUtils.clamp(previousZ + velocity.z * dt, -245, 245);

  function blockedByHouse(x, z) {
    return houseColliders.some((house) => {
      const dx = x - house.x;
      const dz = z - house.z;
      const c = Math.cos(house.rotation);
      const sn = Math.sin(house.rotation);
      const localX = dx * c - dz * sn;
      const localZ = dx * sn + dz * c;
      return Math.abs(localX) < house.halfWidth && Math.abs(localZ) < house.halfDepth;
    });
  }

  function blockedByTree(x, z) {
    const cellX = Math.floor(x / TREE_CELL_SIZE);
    const cellZ = Math.floor(z / TREE_CELL_SIZE);
    // Only inspect nearby grid cells instead of all 5,600 trees each frame.
    for (let gx = cellX - 1; gx <= cellX + 1; gx++) {
      for (let gz = cellZ - 1; gz <= cellZ + 1; gz++) {
        const nearby = treeCollisionGrid.get(gx + ',' + gz);
        if (!nearby) continue;
        for (const tree of nearby) {
          const dx = x - tree.x;
          const dz = z - tree.z;
          if (dx * dx + dz * dz < tree.radius * tree.radius) return true;
        }
      }
    }
    return false;
  }

  function blockedByObstacle(x, z) {
    return blockedByHouse(x, z) || blockedByTree(x, z);
  }

  // Resolve axes separately for accurate wall/tree sliding.
  let resolvedX = nextX;
  let resolvedZ = nextZ;
  if (blockedByObstacle(resolvedX, resolvedZ)) {
    if (!blockedByObstacle(nextX, previousZ)) {
      resolvedZ = previousZ;
      velocity.z = 0;
    } else if (!blockedByObstacle(previousX, nextZ)) {
      resolvedX = previousX;
      velocity.x = 0;
    } else {
      resolvedX = previousX;
      resolvedZ = previousZ;
      velocity.set(0, 0, 0);
    }
  }

  player.position.x = resolvedX;
  player.position.z = resolvedZ;
  player.position.y = terrainHeight(player.position.x, player.position.z);

  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  const moving = horizontalSpeed > 0.35;
  if (moving) {
    const targetYaw = Math.atan2(velocity.x, velocity.z);
    const angleDifference = Math.atan2(
      Math.sin(targetYaw - characterYaw),
      Math.cos(targetYaw - characterYaw)
    );
    characterYaw += angleDifference * (1 - Math.exp(-12 * dt));
    player.rotation.y = characterYaw;
    walkTime += dt * (running ? 14 : 9);
  }

  const stride = THREE.MathUtils.clamp(horizontalSpeed / 7, 0, 1);
  const swing = moving ? Math.sin(walkTime) * 0.62 * stride : 0;
  leftLeg.rotation.x = swing;
  rightLeg.rotation.x = -swing;
  leftArm.rotation.x = -swing * 0.72;
  rightArm.rotation.x = swing * 0.72;
  character.position.y = moving ? Math.abs(Math.sin(walkTime * 2)) * 0.065 * stride : 0;

  const rotatedOffset = cameraOffset.clone().applyAxisAngle(upAxis, yaw);
  cameraTarget.copy(player.position).add(rotatedOffset);
  camera.position.lerp(cameraTarget, 1 - Math.pow(0.0005, dt));
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

  // Clouds drift slowly across the sky to create a living horizon.
  for (const cloud of cloudGroups) {
    cloud.position.x += cloud.userData.drift * dt;
    if (cloud.position.x > 270) cloud.position.x = -270;
  }

  // Let village residents stroll around the village paths.
  for (const villager of villagers) {
    const stroll = clock.elapsedTime * 0.28 + villager.phase;
    const x = villager.originX + Math.sin(stroll) * 2.4;
    const z = villager.originZ + Math.cos(stroll * 0.7) * 1.8;
    villager.person.position.set(x, terrainHeight(x, z), z);
    villager.person.rotation.y = Math.atan2(Math.cos(stroll) * 0.7, Math.cos(stroll));
    const step = Math.sin(stroll * 3.2) * 0.28;
    villager.legs[0].rotation.x = step;
    villager.legs[1].rotation.x = -step;
    villager.arms[0].rotation.x = -step * 0.7;
    villager.arms[1].rotation.x = step * 0.7;
  }

  // Move simple traffic along the winding main road.
  for (const vehicle of traffic) {
    vehicle.z += vehicle.speed * dt;
    if (vehicle.z > 255) vehicle.z = -255;
    const x = roadCenterX(vehicle.z) + vehicle.lane;
    vehicle.car.position.set(x, terrainHeight(x, vehicle.z) + 0.03, vehicle.z);
    vehicle.car.rotation.y = -Math.atan2(
      (roadCenterX(vehicle.z + 0.5) - roadCenterX(vehicle.z - 0.5)),
      1
    );
    for (const wheel of vehicle.wheels) wheel.rotation.x -= vehicle.speed * dt / 0.43;
  }

  if (clock.elapsedTime >= nextTreeLodUpdate) {
    updateDetailedTreeLODs();
    nextTreeLodUpdate = clock.elapsedTime + 0.35;
  }

  // Gentle, intersecting sine waves animate the river surface without a heavy shader.
  const riverWater = scene.userData.riverWater;
  if (riverWater) {
    const positions = riverWater.geometry.attributes.position;
    const base = riverWater.userData.basePositions;
    const time = clock.elapsedTime;
    for (let i = 0; i < positions.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      const wave = Math.sin(x * 0.42 + time * 1.8) * 0.075
        + Math.cos(z * 0.19 - time * 1.25) * 0.045;
      positions.setY(i, base[i * 3 + 1] + wave);
    }
    positions.needsUpdate = true;
    riverWater.geometry.computeVertexNormals();
  }

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
});

document.querySelector('#loading').classList.add('hidden');
