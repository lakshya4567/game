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
    const waterY = baseTerrainHeight(centerX, z) - 0.78;
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
  new THREE.ConeGeometry(2.25, 4.4, 7),
  new THREE.ConeGeometry(1.85, 4.0, 7),
  new THREE.ConeGeometry(1.4, 3.5, 7)
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
    crown.position.y = 3.0 + tier * 1.65;
    crown.castShadow = true;
    tree.add(crown);
  }

  const scale = 0.9 + Math.random() * 0.65;
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
  new THREE.MeshStandardMaterial({ color: 0xd6c39c, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0xc8b18a, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0xb8c6b0, roughness: 1 })
];
const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x70463a, roughness: 1 });
const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0x6d9aa5, roughness: 0.35, metalness: 0.05
});
const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x533c2c, roughness: 1 });

function createHouse(x, z, scale = 1, style = 0) {
  const house = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 4.4), wallMaterials[style % wallMaterials.length]);
  wall.position.y = 1.6;
  wall.castShadow = true;
  wall.receiveShadow = true;
  house.add(wall);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2.5, 4), roofMaterial);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 4.35;
  roof.scale.set(1, 1, 0.82);
  roof.castShadow = true;
  house.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.12), doorMaterial);
  door.position.set(0, 0.95, 2.26);
  house.add(door);

  for (const side of [-1, 1]) {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.1), windowMaterial);
    windowMesh.position.set(side * 1.55, 1.95, 2.27);
    house.add(windowMesh);
  }

  house.scale.setScalar(scale);
  house.position.set(x, terrainHeight(x, z), z);
  house.rotation.y = (Math.random() - 0.5) * 0.35;
  scene.add(house);

  // A tiny yard fence gives each cluster a village-like silhouette.
  const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7759, roughness: 1 });
  for (const side of [-1, 1]) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 8), fenceMaterial);
    fence.position.set(x + side * 5.2 * scale, terrainHeight(x + side * 5.2 * scale, z), z - 1.2);
    fence.castShadow = true;
    scene.add(fence);
  }
}

const villageGroups = [
  { x: -42, z: -76 },
  { x: 72, z: 82 }
];
villageGroups.forEach((village, groupIndex) => {
  const placements = [
    [-5, -5, 1.0], [6, -7, 0.86], [-10, 7, 0.9],
    [7, 6, 1.05], [0, 13, 0.78]
  ];
  placements.forEach(([dx, dz, scale], index) => {
    createHouse(village.x + dx, village.z + dz, scale, groupIndex + index);
  });
});

// --- Low-poly cars travelling along the main road ---------------------------
function createCar(color) {
  const car = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.12 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x263d49, roughness: 0.22, metalness: 0.12
  });
  const tyreMaterial = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 4.1), bodyMaterial);
  body.position.y = 0.85;
  body.castShadow = true;
  car.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.9, 2.05), glassMaterial);
  cabin.position.set(0, 1.55, -0.15);
  cabin.castShadow = true;
  car.add(cabin);

  const wheels = [];
  for (const x of [-1.08, 1.08]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.25, 10),
        tyreMaterial
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.48, z);
      wheel.castShadow = true;
      car.add(wheel);
      wheels.push(wheel);
    }
  }
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe8b0, emissive: 0x665022, roughness: 0.3
  });
  for (const x of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.08), headlightMaterial);
    lamp.position.set(x, 0.95, 2.08);
    car.add(lamp);
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
