import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { actuatorConfig, radToDeg } from './actuator-config.js';
import { initMuJoCo } from './mujoco-loader.js';

const GEOM_TYPES = {
  PLANE: 0,
  SPHERE: 2,
  CAPSULE: 3,
  CYLINDER: 5,
  BOX: 6,
};

const state = {
  mujoco: null,
  model: null,
  data: null,
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  geomMeshes: [],
  actuatorValues: Object.fromEntries(actuatorConfig.map((item) => [item.name, item.defaultRad])),
  isPlaying: true,
  substeps: 5,
  lastFrameTime: performance.now(),
  frameCounter: 0,
  fpsTimer: performance.now(),
  fps: null,
};

const els = {};

function bindElements() {
  els.root = document.getElementById('interactive-demo');
  if (!els.root) return false;
  els.viewer = document.getElementById('mujoco-viewer');
  els.loading = document.getElementById('mujoco-loading');
  els.error = document.getElementById('mujoco-error');
  els.controls = document.getElementById('mujoco-actuator-controls');
  els.reset = document.getElementById('mujoco-reset');
  els.playPause = document.getElementById('mujoco-play-pause');
  els.simTime = document.getElementById('mujoco-sim-time');
  els.fps = document.getElementById('mujoco-fps');
  els.tip = document.getElementById('mujoco-tip');
  return true;
}

function showError(message) {
  if (els.loading) els.loading.hidden = true;
  if (els.error) {
    els.error.hidden = false;
    els.error.textContent = `${message} Interactive demo failed to load. Please try Chrome or Edge, or check whether the WASM files are correctly deployed.`;
  }
}

function assertWebGL() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) throw new Error('WebGL is not available in this browser.');
}

function numberAt(array, index, fallback = 0) {
  const value = array?.[index];
  if (typeof value === 'object' && value !== null && 'value' in value) return value.value;
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function vec3At(array, offset) {
  return [
    numberAt(array, offset),
    numberAt(array, offset + 1),
    numberAt(array, offset + 2),
  ];
}

function rgbaAt(array, offset) {
  return [
    numberAt(array, offset, 0.55),
    numberAt(array, offset + 1, 0.55),
    numberAt(array, offset + 2, 0.55),
    numberAt(array, offset + 3, 1),
  ];
}

function createMaterial(rgba) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
    opacity: rgba[3],
    transparent: rgba[3] < 1,
    roughness: 0.62,
    metalness: 0.08,
  });
}

function createGeometry(type, size) {
  if (type === GEOM_TYPES.SPHERE) {
    return new THREE.SphereGeometry(Math.max(size[0], 0.001), 32, 18);
  }
  if (type === GEOM_TYPES.CAPSULE) {
    const radius = Math.max(size[0], 0.001);
    const cylinderLength = Math.max(size[1] * 2, 0.001);
    const geometry = new THREE.CapsuleGeometry(radius, cylinderLength, 12, 24);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }
  if (type === GEOM_TYPES.CYLINDER) {
    const geometry = new THREE.CylinderGeometry(Math.max(size[0], 0.001), Math.max(size[0], 0.001), Math.max(size[1] * 2, 0.001), 32);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }
  if (type === GEOM_TYPES.BOX) {
    return new THREE.BoxGeometry(Math.max(size[0] * 2, 0.001), Math.max(size[1] * 2, 0.001), Math.max(size[2] * 2, 0.001));
  }
  if (type === GEOM_TYPES.PLANE) {
    const geometry = new THREE.PlaneGeometry(Math.max(size[0] * 2, 0.1), Math.max(size[1] * 2, 0.1));
    return geometry;
  }
  return null;
}

function applyGeomPose(mesh, data, geomId) {
  const posOffset = geomId * 3;
  const matOffset = geomId * 9;
  const pos = vec3At(data.geom_xpos, posOffset);
  const m = data.geom_xmat;
  const matrix = new THREE.Matrix4();
  matrix.set(
    numberAt(m, matOffset), numberAt(m, matOffset + 1), numberAt(m, matOffset + 2), pos[0],
    numberAt(m, matOffset + 3), numberAt(m, matOffset + 4), numberAt(m, matOffset + 5), pos[1],
    numberAt(m, matOffset + 6), numberAt(m, matOffset + 7), numberAt(m, matOffset + 8), pos[2],
    0, 0, 0, 1,
  );
  matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
}

function setupThree() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f7f7);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10);
  camera.up.set(0, 0, 1);
  camera.position.set(0.35, -0.45, 0.28);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  els.viewer.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.1, 0, 0.04);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d8, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(0.3, -0.35, 0.7);
  scene.add(light);

  const grid = new THREE.GridHelper(0.6, 12, 0xd2d2d2, 0xe3e3e3);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -0.039;
  scene.add(grid);

  Object.assign(state, { scene, camera, renderer, controls });
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);
}

function resizeRenderer() {
  if (!state.renderer || !els.viewer) return;
  const rect = els.viewer.getBoundingClientRect();
  const width = Math.max(rect.width, 320);
  const height = Math.max(rect.height, 320);
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(width, height, false);
}

function buildSceneFromModel() {
  const { model, data, scene } = state;
  const supported = new Set([GEOM_TYPES.PLANE, GEOM_TYPES.SPHERE, GEOM_TYPES.CAPSULE, GEOM_TYPES.CYLINDER, GEOM_TYPES.BOX]);

  for (let i = 0; i < model.ngeom; i += 1) {
    const type = numberAt(model.geom_type, i, -1);
    if (!supported.has(type)) continue;

    const size = vec3At(model.geom_size, i * 3);
    const rgba = rgbaAt(model.geom_rgba, i * 4);
    const geometry = createGeometry(type, size);
    if (!geometry) continue;

    const mesh = new THREE.Mesh(geometry, createMaterial(rgba));
    mesh.matrixAutoUpdate = true;
    applyGeomPose(mesh, data, i);
    scene.add(mesh);
    state.geomMeshes.push({ id: i, mesh });
  }
}

function buildActuatorPanel() {
  els.controls.innerHTML = '';
  actuatorConfig.forEach((config) => {
    const row = document.createElement('div');
    row.className = 'mujoco-slider-row';

    const header = document.createElement('div');
    header.className = 'mujoco-slider-header';

    const label = document.createElement('label');
    label.textContent = config.name;
    label.htmlFor = `slider-${config.name}`;

    const value = document.createElement('span');
    value.id = `value-${config.name}`;
    value.textContent = formatValue(config.defaultRad);

    const slider = document.createElement('input');
    slider.id = `slider-${config.name}`;
    slider.type = 'range';
    slider.min = String(config.minRad);
    slider.max = String(config.maxRad);
    slider.step = '0.001';
    slider.value = String(config.defaultRad);
    slider.addEventListener('input', () => {
      const rad = Number(slider.value);
      state.actuatorValues[config.name] = rad;
      value.textContent = formatValue(rad);
      writeControls();
    });

    header.append(label, value);
    row.append(header, slider);
    els.controls.appendChild(row);
  });
}

function formatValue(rad) {
  return `${rad.toFixed(3)} rad / ${radToDeg(rad).toFixed(1)} deg`;
}

function writeControls() {
  if (!state.data) return;
  actuatorConfig.forEach((config, index) => {
    state.data.ctrl[index] = state.actuatorValues[config.name];
  });
}

function resetSimulation() {
  const { mujoco, model, data } = state;
  if (!mujoco || !model || !data) return;
  mujoco.mj_resetData(model, data);
  actuatorConfig.forEach((config) => {
    state.actuatorValues[config.name] = config.defaultRad;
    const slider = document.getElementById(`slider-${config.name}`);
    const value = document.getElementById(`value-${config.name}`);
    if (slider) slider.value = String(config.defaultRad);
    if (value) value.textContent = formatValue(config.defaultRad);
  });
  writeControls();
  mujoco.mj_forward(model, data);
  updateStatus();
}

function togglePlayPause() {
  state.isPlaying = !state.isPlaying;
  els.playPause.textContent = state.isPlaying ? 'Pause' : 'Play';
}

function updateGeomMeshes() {
  state.geomMeshes.forEach(({ id, mesh }) => applyGeomPose(mesh, state.data, id));
}

function updateStatus() {
  const { data } = state;
  if (!data) return;
  els.simTime.textContent = `${Number(data.time || 0).toFixed(3)} s`;
  els.fps.textContent = state.fps ? String(state.fps) : '--';

  let tipText = '--';
  try {
    const tip = data.site('upper_tip_site').xpos;
    tipText = `${numberAt(tip, 0).toFixed(3)}, ${numberAt(tip, 1).toFixed(3)}, ${numberAt(tip, 2).toFixed(3)} m`;
  } catch (error) {
    const last = state.geomMeshes[state.geomMeshes.length - 1];
    if (last) {
      tipText = `${last.mesh.position.x.toFixed(3)}, ${last.mesh.position.y.toFixed(3)}, ${last.mesh.position.z.toFixed(3)} m`;
    }
  }
  els.tip.textContent = tipText;
}

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  if (state.isPlaying && state.mujoco && state.model && state.data) {
    writeControls();
    for (let i = 0; i < state.substeps; i += 1) {
      state.mujoco.mj_step(state.model, state.data);
    }
  }

  if (state.data) {
    updateGeomMeshes();
    updateStatus();
  }

  state.controls?.update();
  state.renderer?.render(state.scene, state.camera);

  state.frameCounter += 1;
  if (now - state.fpsTimer >= 500) {
    state.fps = Math.round((state.frameCounter * 1000) / (now - state.fpsTimer));
    state.frameCounter = 0;
    state.fpsTimer = now;
  }
  state.lastFrameTime = now;
}

async function main() {
  if (!bindElements()) return;

  try {
    assertWebGL();
    buildActuatorPanel();
    setupThree();
    const simulation = await initMuJoCo();
    Object.assign(state, simulation);

    if (state.model.nu < actuatorConfig.length) {
      throw new Error('Model initialized, but no actuator was found.');
    }

    buildSceneFromModel();
    writeControls();
    els.reset.addEventListener('click', resetSimulation);
    els.playPause.addEventListener('click', togglePlayPause);
    if (els.loading) els.loading.hidden = true;
    animate();
  } catch (error) {
    console.error(error);
    showError(error.message || 'MuJoCo WASM failed to load.');
  }
}

main();
