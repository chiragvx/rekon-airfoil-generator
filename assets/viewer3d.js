import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { inject } from '@vercel/analytics';

inject();

let scene3d, camera3d, renderer3d, mesh3d, controls3d;
let animId = null;
let isWireframe = true;
let dirLight, ambLight;

window.initView3d = function (coords) {
  const canvas = document.getElementById('view3dCanvas');
  if (!canvas || !coords || !coords.upper.length) return;
  const { upper, lower } = coords;
  const pts = [...upper, ...lower.slice(1).reverse()];
  const shape = new THREE.Shape();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const extrudeSettings = { depth: 0.25, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.computeVertexNormals();
  if (mesh3d && scene3d) scene3d.remove(mesh3d);
  if (mesh3d && mesh3d.geometry) mesh3d.geometry.dispose();
  if (mesh3d && mesh3d.material) mesh3d.material.dispose();
  let mat;
  if (isWireframe) {
    const isLight = document.body.classList.contains('light-mode');
    mat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0366d6 : 0xff3b1d,
      wireframe: true,
      side: THREE.DoubleSide,
    });
  } else {
    mat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
  }
  mesh3d = new THREE.Mesh(geometry, mat);
  if (!scene3d) {
    scene3d = new THREE.Scene();
    const isLight = document.body.classList.contains('light-mode');
    scene3d.background = new THREE.Color(isLight ? 0xf5f7f9 : 0x0a0a0a);
    dirLight = new THREE.DirectionalLight(0xffffff, isWireframe ? 0.9 : 1.5);
    dirLight.position.set(2, 2, 2);
    scene3d.add(dirLight);
    ambLight = new THREE.AmbientLight(0xffffff, isWireframe ? 0.15 : 0.4);
    scene3d.add(ambLight);
    camera3d = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    camera3d.position.set(0.8, 0.5, 1.2);
    camera3d.lookAt(0, 0, 0);
    renderer3d = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer3d.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    controls3d = new OrbitControls(camera3d, canvas);
    controls3d.enableDamping = true;
    controls3d.dampingFactor = 0.05;
  } else {
    const isLight = document.body.classList.contains('light-mode');
    scene3d.background.set(isLight ? 0xf5f7f9 : 0x0a0a0a);
    if (dirLight && ambLight) updateLighting();
  }
  scene3d.add(mesh3d);
  resize3d();
  // render3d() will be handled by switchTo3d
};

function updateLighting() {
  if (!dirLight || !ambLight) return;
  if (isWireframe) {
    dirLight.intensity = 0.9;
    ambLight.intensity = 0.15;
  } else {
    dirLight.intensity = 1.5;
    ambLight.intensity = 0.4;
  }
}

window.toggleWireframe = function () {
  isWireframe = true;
  document.getElementById('wireframeBtn').classList.add('active');
  document.getElementById('solidBtn').classList.remove('active');
  if (mesh3d && window.lastCoords && window.lastCoords.upper.length) {
    const coords = window.lastCoords;
    window.initView3d(coords);
  }
};

window.toggleSolid = function () {
  isWireframe = false;
  document.getElementById('wireframeBtn').classList.remove('active');
  document.getElementById('solidBtn').classList.add('active');
  if (mesh3d && window.lastCoords && window.lastCoords.upper.length) {
    const coords = window.lastCoords;
    window.initView3d(coords);
  }
};

function resize3d() {
  const canvas = document.getElementById('view3dCanvas');
  if (!renderer3d || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (canvas.width !== w || canvas.height !== h) {
    renderer3d.setSize(w, h);
    camera3d.aspect = w / h;
    camera3d.updateProjectionMatrix();
  }
}

function render3d() {
  if (!renderer3d || !scene3d || animId === null) return;
  resize3d();
  controls3d && controls3d.update();
  renderer3d.render(scene3d, camera3d);
  animId = requestAnimationFrame(render3d);
}

window.stopView3d = function () {
  if (animId !== null) {
    cancelAnimationFrame(animId);
    animId = null;
  }
};

window.switchTo3d = function (coords) {
  document.getElementById('view2dWrap').classList.add('hidden');
  document.getElementById('view3dWrap').classList.remove('hidden');
  document.getElementById('view3dModeSwitch').classList.remove('hidden');
  document.getElementById('view2dBtn').classList.remove('active');
  document.getElementById('view3dBtn').classList.add('active');

  window.stopView3d(); // Ensure no existing loop
  window.initView3d(coords);
  animId = requestAnimationFrame(render3d);
};

window.switchTo2d = function () {
  window.stopView3d();
  document.getElementById('view2dWrap').classList.remove('hidden');
  document.getElementById('view3dWrap').classList.add('hidden');
  document.getElementById('view3dModeSwitch').classList.add('hidden');
  document.getElementById('view2dBtn').classList.add('active');
  document.getElementById('view3dBtn').classList.remove('active');

  // Ensure 2D canvas is redrawn when it becomes visible
  if (window.lastCoords && window.lastCoords.upper.length) {
    window.drawView2d(window.lastCoords);
  }
};

window.addEventListener('resize', () => { if (document.getElementById('view3dWrap').classList.contains('hidden')) return; resize3d(); });
