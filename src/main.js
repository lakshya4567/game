import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import './style.css';

// A performance-conscious Three.js open-world prototype.
// The same terrainHeight() function positions the terrain, road, vegetation
// and player, preventing props from being placed at an unrelated y = 0 level.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d7e5);
scene.fog = new THREE.FogExp2(0xb9d7e5, 0.0026);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 650);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'low-power'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#game').appendChild(renderer.domElement);

// --- Atmosphere and sunlight -------------------------------------------------
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms.turbidity.value = 7;
skyUniforms.rayleigh.value = 2.2;
skyUniforms.mieCoefficient.value = 0.006;
skyUniforms.mieDirectionalG.value = 0.82;

const sunDirection = new THREE.Vector3().setFromSphericalCoords(
  1,
  THREE.MathUtils.degToRad(88),
  THREE.MathUtils.degToRad(205)
);
skyUniforms.sunPosition.value.copy(sunDirection);

scene.add(new THREE.HemisphereLight(0xd8edff, 0x596344, 1.35));

const sun = new THREE.DirectionalLight(0xffe5c2, 2.1);
sun.position.copy(sunDirection).multiplyScalar(120);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
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

const terrainGeometry = new THREE.PlaneGeometry(320, 320, 120, 120);
const terrainPositions = terrainGeometry.attributes.position;

for (let i = 0; i < terrainPositions.count; i++) {
  const x = terrainPositions.getX(i);
  const z = -terrainPositions.getY(i);
  terrainPositions.setZ(i, terrainHeight(x, z));
}
terrainGeometry.computeVertexNormals();

const ground = new THREE.Mesh(
  terrainGeometry,
  new THREE.MeshStandardMaterial({
    color: 0x718b58,
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
    const z = -155 + (310 * i / segments);
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
      const z = -155 + (310 * i / segments);
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
    const x = -145 + (290 * i / segments);
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
    const z = -155 + 310 * i / segments;
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
  scene.add(water);

  // Soft sandy/pebbly banks make the water edge readable from a distance.
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const z = -155 + 310 * i / segments;
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
  const distance = 135 + Math.random() * 35;
  hill.position.set(
    Math.cos(angle) * distance,
    -radius * 0.54,
    Math.sin(angle) * distance
  );
  hill.scale.y = 0.52;
  hill.receiveShadow = true;
  scene.add(hill);
}

// --- Terrain-aligned forest ---------------------------------------------------
const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x59402e,
  roughness: 1
});
const spruceMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x173f35, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x205343, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x2c624b, roughness: 1 })
];
const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 7);
const spruceTierGeometry = [
  new THREE.ConeGeometry(2.8, 5.2, 7),
  new THREE.ConeGeometry(2.25, 4.8, 7),
  new THREE.ConeGeometry(1.7, 4.2, 7)
];

// Taller layered spruce trees, kept clear of roads and the river corridor.
for (let i = 0; i < 245; i++) {
  const x = (Math.random() - 0.5) * 290;
  const z = (Math.random() - 0.5) * 290;
  if (Math.abs(x - roadCenterX(z)) < 9) continue;
  if (Math.abs(z - (Math.sin(x * 0.014) * 5 - 28)) < 7) continue;
  if (Math.abs(x - riverCenterX(z)) < 10) continue;

  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 1.6;
  trunk.castShadow = true;
  tree.add(trunk);

  for (let tier = 0; tier < 3; tier++) {
    const crown = new THREE.Mesh(spruceTierGeometry[tier], spruceMaterials[(i + tier) % spruceMaterials.length]);
    crown.position.y = 3.4 + tier * 1.9;
    crown.castShadow = true;
    tree.add(crown);
  }

  const scale = 1.35 + Math.random() * 0.65;
  tree.scale.setScalar(scale);
  tree.position.set(x, terrainHeight(x, z), z);
  tree.rotation.y = Math.random() * Math.PI * 2;
  scene.add(tree);
}

// Instanced grass keeps draw calls low.
const grassGeometry = new THREE.ConeGeometry(0.13, 0.65, 4);
const grassMaterial = new THREE.MeshStandardMaterial({
  color: 0x78965a,
  roughness: 1
});
const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 600);
const grassDummy = new THREE.Object3D();
let grassIndex = 0;

for (let i = 0; i < 600; i++) {
  const x = (Math.random() - 0.5) * 290;
  const z = (Math.random() - 0.5) * 290;
  if (Math.abs(x - roadCenterX(z)) < 6) continue;

  grassDummy.position.set(x, terrainHeight(x, z) + 0.28, z);
  grassDummy.rotation.set(0, Math.random() * Math.PI, 0);
  const scale = 0.5 + Math.random() * 0.8;
  grassDummy.scale.set(scale, scale, scale);
  grassDummy.updateMatrix();
  grass.setMatrixAt(grassIndex++, grassDummy.matrix);
}

grass.count = grassIndex;
scene.add(grass);

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

function createHouse(x, z, scale = 1, style = 0) {
  const house = new THREE.Group();
  const wallMaterial = wallMaterials[style % wallMaterials.length];
  const roofMaterial = roofMaterials[style % roofMaterials.length];
  const width = style % 3 === 0 ? 7.4 : style % 3 === 1 ? 6.3 : 8.2;
  const depth = style % 2 === 0 ? 6.4 : 7.2;
  const wallHeight = style % 3 === 2 ? 5.0 : 4.1;

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

  for (const side of [-1, 1]) {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 0.12), windowMaterial);
    windowMesh.position.set(side * width * 0.29, wallHeight * 0.57, depth / 2 + 0.09);
    house.add(windowMesh);
  }

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
  house.rotation.y = (Math.random() - 0.5) * 0.35;
  scene.add(house);

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
  { x: 72, z: 82 },
  { x: -96, z: 42 }
];
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
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.06), dark);
  grille.position.set(0, 0.83, 2.2);
  car.add(grille);
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
  player.position.addScaledVector(velocity, dt);

  player.position.x = THREE.MathUtils.clamp(player.position.x, -150, 150);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -150, 150);
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
    if (vehicle.z > 158) vehicle.z = -158;
    const x = roadCenterX(vehicle.z) + vehicle.lane;
    vehicle.car.position.set(x, terrainHeight(x, vehicle.z) + 0.03, vehicle.z);
    vehicle.car.rotation.y = -Math.atan2(
      (roadCenterX(vehicle.z + 0.5) - roadCenterX(vehicle.z - 0.5)),
      1
    );
    for (const wheel of vehicle.wheels) wheel.rotation.x -= vehicle.speed * dt / 0.43;
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
