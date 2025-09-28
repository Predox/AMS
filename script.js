// ==================== Cena 1 (Hero) • Setup / Renderer ====================
const hero = document.querySelector('.hero-3d');
const canvas1 = document.querySelector('.obj3d');

const renderer1 = new THREE.WebGLRenderer({
  canvas: canvas1,
  antialias: false,               // performance (use FXAA/TAA só se precisar)
  alpha: true,                    // se não precisar transparência, pode ser false
  powerPreference: 'high-performance',
  precision: 'mediump'
});
renderer1.setClearColor(0x000000, 0);
renderer1.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1)); // cap DPR

const scene1 = new THREE.Scene();
const camera1 = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera1.position.set(0, 0, 9);

// Fit responsivo com ResizeObserver (mais estável que vários listeners)
function fitHero() {
  const rect = hero.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  renderer1.setSize(w, h, false);
  camera1.aspect = w / h;
  camera1.updateProjectionMatrix();
}
fitHero();
new ResizeObserver(fitHero).observe(hero);

// ==================== Cena 1 • Luzes e Grupo ====================
scene1.add(new THREE.AmbientLight(0xffffff, 0.5));
const dir1 = new THREE.DirectionalLight(0xffffff, 0.7);
dir1.position.set(3, 8, 8);
scene1.add(dir1);

const group1 = new THREE.Group();
scene1.add(group1);

// ==================== Cena 1 • Parâmetros de Scroll/Animação ====================
const SCROLL_START = 0;
const SCROLL_END = 500;
const ROT_START = 50, ROT_END = 240;
let SCALE_START = 1.3, SCALE_END = 1.10;
let START_NDC = { x: -0.4, y: 0.1 };
let END_NDC   = { x: -0.7, y: 0.0 };

const SMOOTH = 0.12;
let rotYCurrent = 0, scaleCurrent = SCALE_START;
const posCurrent = new THREE.Vector3();
const startWorld = new THREE.Vector3();
const endWorld   = new THREE.Vector3();
let modelReady1  = false;

// Breakpoints (aplicado em resize e no início)
function applyBreakpoints() {
  if (window.innerWidth <= 980) {
    SCALE_START = 0.8;
    SCALE_END   = 0.3;
    START_NDC   = { x: -0.1, y: 0.1 };
    END_NDC     = { x: -0.9, y: 0.0 };
  } else {
    SCALE_START = 1.3;
    SCALE_END   = 1.10;
    START_NDC   = { x: -0.4, y: 0.1 };
    END_NDC     = { x: -0.7, y: 0.0 };
  }
  if (modelReady1) recomputeTargets1();
}
applyBreakpoints();
window.addEventListener('resize', applyBreakpoints);
window.addEventListener('orientationchange', applyBreakpoints);

// ==================== Cena 1 • Helpers de Posição ====================
function worldPosAtSameDepth(obj, ndcX, ndcY) {
  const ndc = obj.position.clone().project(camera1);
  const v = new THREE.Vector3(ndcX, ndcY, ndc.z);
  return v.unproject(camera1);
}
function recomputeTargets1() {
  startWorld.copy(worldPosAtSameDepth(group1, START_NDC.x, START_NDC.y));
  endWorld.copy(worldPosAtSameDepth(group1, END_NDC.x, END_NDC.y));
}

// ==================== DRACO opcional (só se existir no ambiente) ====================
let dracoLoader = null;
if (THREE.DRACOLoader) {
  dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
}

// ==================== Cena 1 • Carregamento do Modelo ====================
const loader1 = new THREE.GLTFLoader();
if (dracoLoader) loader1.setDRACOLoader(dracoLoader);

loader1.load("hero-3d.glb", (gltf) => {
  group1.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = new THREE.Vector3(); box.getCenter(center);
  gltf.scene.position.sub(center);
  posCurrent.copy(group1.position);
  modelReady1 = true;
  recomputeTargets1();
});

// ==================== Cena 2 (Canvas Secundário) • Setup / Renderer ====================
const canvas_second = document.querySelector(".obj3d-2");
const renderer_second = new THREE.WebGLRenderer({
  canvas: canvas_second,
  antialias: false,
  alpha: true, // se puder, deixe false
  powerPreference: 'high-performance',
  precision: 'mediump'
});
renderer_second.setClearColor(0x000000, 0);
renderer_second.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));

const scene_second  = new THREE.Scene();
const camera_second = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera_second.position.set(0, 0, 5);

// Luzes (removida duplicata de HemisphereLight)
scene_second.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
const dir2 = new THREE.DirectionalLight(0xffffff, 0.45);
dir2.position.set(3, 8, 8);
scene_second.add(dir2);
const fill2 = new THREE.PointLight(0xffffff, 0.25);
fill2.position.set(-5, 2, -5);
scene_second.add(fill2);

// Fit responsivo com ResizeObserver
function fitSecond() {
  const w = Math.max(1, canvas_second.clientWidth);
  const h = Math.max(1, canvas_second.clientHeight);
  renderer_second.setSize(w, h, false);
  camera_second.aspect = w / h;
  camera_second.updateProjectionMatrix();
}
fitSecond();
new ResizeObserver(fitSecond).observe(canvas_second);

const group_second = new THREE.Group();
scene_second.add(group_second);

// ==================== Cena 2 • Carregamento do Modelo ====================
const loader2 = new THREE.GLTFLoader();
if (dracoLoader) loader2.setDRACOLoader(dracoLoader);

loader2.load("metrics-3d.glb", (gltf) => {
  group_second.add(gltf.scene);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = new THREE.Vector3(); box.getCenter(center);
  gltf.scene.position.sub(center);
});

// ==================== Cena 2 • Interação do Mouse ====================
let targetRotX = 0, targetRotY = 0.6;
window.addEventListener("mousemove", (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = (e.clientY / window.innerHeight) * 2 - 1;
  targetRotY = nx * 0.8;
  targetRotX = ny * 0.5;
}, { passive: true });

// ==================== Loop Único + Pausas (viewport/aba) + Cap FPS ====================
let run1 = true;
let run2 = true;

// pausa quando a aba fica oculta
document.addEventListener('visibilitychange', () => {
  const vis = !document.hidden;
  run1 = vis && run1;
  run2 = vis && run2;
});

// pausa quando os elementos saem da viewport
new IntersectionObserver(([e]) => { run1 = e.isIntersecting && !document.hidden; }, { threshold: 0.01 }).observe(hero);
new IntersectionObserver(([e]) => { run2 = e.isIntersecting && !document.hidden; }, { threshold: 0.01 }).observe(canvas_second);

// Cap de FPS em mobile
let targetFPS = /Mobi|Android/i.test(navigator.userAgent) ? 30 : 60;
let frameInterval = 1000 / targetFPS;
let last = 0;

function tick(now = 0) {
  requestAnimationFrame(tick);
  if (now - last < frameInterval) return;
  last = now;

  // ===== Cena 1 =====
  if (run1) {
    const y = window.scrollY || window.pageYOffset || 0;
    const t = Math.max(0, Math.min(1, (y - SCROLL_START) / (SCROLL_END - SCROLL_START)));

    if (modelReady1) {
      const rotTarget   = THREE.MathUtils.degToRad(ROT_START + (ROT_END - ROT_START) * t);
      const scaleTarget = SCALE_START + (SCALE_END - SCALE_START) * t;
      const posTarget   = new THREE.Vector3().copy(startWorld).lerp(endWorld, t);

      rotYCurrent   += (rotTarget - rotYCurrent) * SMOOTH;
      scaleCurrent  += (scaleTarget - scaleCurrent) * SMOOTH;
      posCurrent.lerp(posTarget, SMOOTH);

      group1.rotation.y = rotYCurrent;
      group1.scale.setScalar(scaleCurrent);
      group1.position.copy(posCurrent);
    }
    renderer1.render(scene1, camera1);
  }

  // ===== Cena 2 =====
  if (run2) {
    group_second.rotation.y += (targetRotY - group_second.rotation.y) * 0.05;
    group_second.rotation.x += (targetRotX - group_second.rotation.x) * 0.05;
    renderer_second.render(scene_second, camera_second);
  }
}
requestAnimationFrame(tick);

// ==================== Ajustes de Canvas ====================
canvas1.style.width = '';
canvas1.style.height = '';

// ==================== Nav Mobile (Hambúrguer / Drawer) ====================
const btnToggle  = document.querySelector('.nav-toggle');
const drawer     = document.getElementById('mobile-menu');

function openDrawer(){
  drawer.hidden = false;
  drawer.setAttribute('data-open','true');
  btnToggle.classList.add('is-open');
  btnToggle.setAttribute('aria-expanded','true');
  document.body.classList.add('menu-open');
  document.querySelector('.nav-sticky').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function closeDrawer(){
  drawer.setAttribute('data-open','false');
  btnToggle.classList.remove('is-open');
  btnToggle.setAttribute('aria-expanded','false');
  document.body.classList.remove('menu-open');
  setTimeout(()=>{ if(drawer.getAttribute('data-open')==='false') drawer.hidden = true; }, 300);
}
function toggleDrawer(){
  const isOpen = drawer.getAttribute('data-open') === 'true';
  isOpen ? closeDrawer() : openDrawer();
}

btnToggle.addEventListener('click', toggleDrawer);
window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeDrawer(); });
window.addEventListener('resize', ()=>{ if(window.innerWidth > 1280) closeDrawer(); });

// ==================== Efeito de Scroll no Nav ====================
const nav = document.querySelector('.nav-sticky');
window.addEventListener('scroll', () => {
  if (window.scrollY > (window.innerHeight - 20)) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});
