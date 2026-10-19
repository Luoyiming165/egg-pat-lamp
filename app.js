/* ============================================================
 * 东东羊拍拍灯 · DongDong Pat Lamp
 * 原型：《蛋仔派对》× Flying DongDong 联动的云彩小羊
 * 雪白植绒羊毛 · 豆豆眼 · 红圆框眼镜 · 腮红 · 画笔调色板
 * Three.js r147 · 全程序化建模，无外部贴图
 * 交互：轻拍小羊 → 开关灯；拖动 → 旋转视角；滚轮 → 缩放；空格 → 开关
 * ============================================================ */
'use strict';

/* ---------- 渲染器 / 场景 / 相机 ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  document.body.innerHTML = '<div style="color:#eee;padding:40px;font-size:16px">当前浏览器不支持 WebGL，换个浏览器试试吧～</div>';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 60);

/* ---------- 灯光 ---------- */
// 冷色环境光：关灯时也能看清小羊轮廓
scene.add(new THREE.AmbientLight(0x3a4160, 0.55));
scene.add(new THREE.HemisphereLight(0xfff2dd, 0x2a3050, 0.35));

// 小羊体内的暖光（主灯）
const lampLight = new THREE.PointLight(0xffc076, 0, 11, 2);
lampLight.position.set(0, 0.4, 0.5);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024);
lampLight.shadow.bias = -0.004;
scene.add(lampLight);

// 背部冷色轮廓光
const rim = new THREE.DirectionalLight(0x88a0ff, 0.5);
rim.position.set(-3, 4, -4);
scene.add(rim);

/* ============================================================
 * 东东羊
 * ============================================================ */
const eggWrap = new THREE.Group();   // 负责漂浮
const eggGroup = new THREE.Group();  // 负责拍打形变
eggWrap.add(eggGroup);
scene.add(eggWrap);

const W = 1.05; // 身体最大半径
const H = 1.15; // 身体半高

// 身体轮廓线（旋转体 LatheGeometry，圆滚滚的蛋形）
function eggProfilePoints() {
  const pts = [];
  const N = 36;
  for (let i = 0; i <= N; i++) {
    const u = i / N;                      // 0 = 顶部, 1 = 底部
    const y = 1.03 - 1.97 * u;
    const r = Math.max(0.015, Math.sqrt(Math.max(0, 1 - y * y)) * (1 + 0.2 * y));
    pts.push(new THREE.Vector2(r * W, y * H));
  }
  return pts;
}
// 任意高度处的身体半径（给羊毛撒点用）
function eggR(y) {
  return Math.max(0.02, Math.sqrt(Math.max(0, 1 - y * y)) * (1 + 0.2 * y)) * W;
}

// 身体：雪白植绒质感（哑光），开灯时整体透出暖光
const bodyMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.95,
  emissive: 0xffb45e,
  emissiveIntensity: 0,
});
const body = new THREE.Mesh(new THREE.LatheGeometry(eggProfilePoints(), 48), bodyMat);
body.castShadow = true;
body.receiveShadow = true;
eggGroup.add(body);

/* ---------- 羊毛：身体铺一层 + 头顶蜷成一团 ---------- */
const woolGeo = new THREE.SphereGeometry(0.09, 10, 8);
const woolMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

// 在身体表面撒羊毛球，避开脸和脚
function scatterWool(count, maskFn) {
  const items = [];
  let guard = 0;
  while (items.length < count && guard++ < count * 20) {
    const a = Math.random() * Math.PI * 2;
    const y = -0.90 + Math.random() * 1.95;
    const rs = eggR(y) * 0.93;
    const rr = rs * Math.sqrt(Math.random());
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (maskFn && maskFn(x, y, z)) continue;
    items.push({ x: x, y: y * H, z: z, s: 0.7 + Math.random() * 0.7 });
  }
  return items;
}
// 脸部留白 + 脚部留白
function bodyWoolMask(x, y, z) {
  if (z <= 0) return false;
  if (Math.abs(Math.atan2(x, z)) < 0.7 && y > -0.5 && y < 1.05) return true;
  if (y < -0.7 && Math.abs(x) < 0.55) return true;
  return false;
}
// 头顶羊毛蜷成一团的小圆顶
function headWoolItems() {
  const items = [];
  for (let i = 0; i < 50; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = 0.78 + Math.random() * 0.52;
    const rMax = 0.65 * (1 - (y - 0.78) / 0.52);
    const r = Math.max(0.02, rMax) * Math.sqrt(Math.random());
    items.push({ x: Math.cos(a) * r, y: y * H, z: Math.sin(a) * r, s: 0.7 + Math.random() * 0.8 });
  }
  return items;
}
function woolMesh(items) {
  const m = new THREE.InstancedMesh(woolGeo, woolMat, items.length);
  const mat4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  items.forEach((it, i) => {
    p.set(it.x, it.y, it.z);
    q.identity();
    s.setScalar(it.s);
    mat4.compose(p, q, s);
    m.setMatrixAt(i, mat4);
  });
  m.instanceMatrix.needsUpdate = true;
  return m;
}
eggGroup.add(woolMesh(scatterWool(240, bodyWoolMask)));
eggGroup.add(woolMesh(headWoolItems()));

/* ---------- 脸部：豆豆眼 + 红圆框眼镜 + 腮红 + 微笑 ---------- */
function makeEye(side) { // side: -1 左, +1 右
  const g = new THREE.Group();
  // 豆豆眼
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.25 })
  );
  // 高光
  const hi = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  hi.position.set(0.018, 0.022, 0.042);
  g.add(dot, hi);
  g.position.set(0.24 * side, 0.40, 1.02);
  g.rotation.y = 0.23 * side; // 贴着身体曲线朝外
  return g;
}
const eyeL = makeEye(-1);
const eyeR = makeEye(1);
eggGroup.add(eyeL, eyeR);

// 红圆框眼镜（无镜片）
const glasses = new THREE.Group();
const glassMat = new THREE.MeshStandardMaterial({ color: 0xd84b4b, roughness: 0.3 });
const frameGeo = new THREE.TorusGeometry(0.205, 0.032, 10, 26);
for (const side of [-1, 1]) {
  const f = new THREE.Mesh(frameGeo, glassMat);
  f.position.set(0.24 * side, 0.40, 1.06);
  f.rotation.y = 0.23 * side;
  glasses.add(f);
}
const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.34, 8), glassMat);
bridge.rotation.z = Math.PI / 2;
bridge.position.set(0, 0.42, 1.045);
glasses.add(bridge);
eggGroup.add(glasses);

// 两朵腮红
function makeCheek(side) {
  const c = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xff9fb2, roughness: 0.6, transparent: true, opacity: 0.85 })
  );
  c.scale.set(0.95, 0.6, 0.45);
  c.position.set(0.45 * side, 0.15, 0.55);
  c.rotation.y = 0.5 * side;
  return c;
}
eggGroup.add(makeCheek(-1), makeCheek(1));

// 微笑（半圈小圆环）
const mouth = new THREE.Mesh(
  new THREE.TorusGeometry(0.11, 0.035, 12, 24, Math.PI * 0.85),
  new THREE.MeshStandardMaterial({ color: 0x6b4a3f, roughness: 0.5 })
);
mouth.position.set(0, 0.08, 0.63);
mouth.rotation.set(0.25, 0, Math.PI);
eggGroup.add(mouth);

/* ---------- 画家道具：调色板 + 画笔 ---------- */
// 木质调色板，别在右手边
const paletteGroup = new THREE.Group();
const disc = new THREE.Mesh(
  new THREE.CylinderGeometry(0.34, 0.34, 0.05, 24),
  new THREE.MeshStandardMaterial({ color: 0xc99a68, roughness: 0.8 })
);
paletteGroup.add(disc);
const paints = [
  [0xff6b6b, 0.12, 0.10], [0xffd166, -0.02, 0.15], [0x6ba8ff, -0.15, 0.05],
  [0x8fd16f, 0.05, -0.10], [0xffffff, -0.10, -0.14],
];
for (const [c, dx, dz] of paints) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
  d.position.set(dx, 0.032, dz);
  paletteGroup.add(d);
}
paletteGroup.position.set(1.08, -0.05, 0.62);
paletteGroup.rotation.set(-0.9, 0.4, 0.55);
eggGroup.add(paletteGroup);

// 画笔，靠在左手边
const brushGroup = new THREE.Group();
const handle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.022, 0.022, 0.4, 10),
  new THREE.MeshStandardMaterial({ color: 0xd9a05f, roughness: 0.7 })
);
handle.position.y = 0.2;
const ferrule = new THREE.Mesh(
  new THREE.CylinderGeometry(0.026, 0.026, 0.07, 10),
  new THREE.MeshStandardMaterial({ color: 0xc9c9c9, roughness: 0.4, metalness: 0.6 })
);
ferrule.position.y = 0.42;
const tip = new THREE.Mesh(
  new THREE.ConeGeometry(0.03, 0.10, 10),
  new THREE.MeshStandardMaterial({ color: 0x555b6e, roughness: 0.6 })
);
tip.position.y = 0.50;
brushGroup.add(handle, ferrule, tip);
brushGroup.position.set(-0.98, -0.08, 0.55);
brushGroup.rotation.set(-0.5, 0, 0.85);
eggGroup.add(brushGroup);

/* ---------- 小短手和小短腿 ---------- */
function makeArm(side) {
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), woolMat);
  a.scale.set(0.85, 1.15, 0.85);
  a.position.set(0.98 * side, -0.15, 0.30);
  a.rotation.z = -0.5 * side; // 小短手向外撇
  return a;
}
const armL = makeArm(-1), armR = makeArm(1);
eggGroup.add(armL, armR);

function makeLeg(side) {
  const l = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
  );
  l.scale.set(1.15, 0.7, 1.0);
  l.position.set(0.30 * side, -1.16, 0.18);
  return l;
}
const legL = makeLeg(-1), legR = makeLeg(1);
eggGroup.add(legL, legR);

// 可拍打对象：小羊全身（含羊毛，InstancedMesh 也能被射线命中）
const patTargets = [];
eggGroup.traverse(o => { if (o.isMesh) patTargets.push(o); });

/* ============================================================
 * 场景道具
 * ============================================================ */
// 双层小圆台
const pedestalTop = new THREE.Mesh(
  new THREE.CylinderGeometry(0.95, 0.85, 0.30, 48),
  new THREE.MeshStandardMaterial({ color: 0xebdcc4, roughness: 0.9 })
);
pedestalTop.position.y = -1.39;
pedestalTop.receiveShadow = true;
const pedestalBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.30, 1.42, 0.14, 48),
  new THREE.MeshStandardMaterial({ color: 0xcbb797, roughness: 0.9 })
);
pedestalBase.position.y = -1.60;
pedestalBase.receiveShadow = true;
scene.add(pedestalTop, pedestalBase);

// 地板
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9, 48),
  new THREE.MeshStandardMaterial({ color: 0x141829, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.66;
floor.receiveShadow = true;
scene.add(floor);

// 云彩羊身边飘着的小云朵（Flying DongDong 是能变成云彩的羊）
function makeCloud(x, y, z, s) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 1,
    emissive: 0xffc9a0, emissiveIntensity: 0,
  });
  const blobs = [[0, 0, 0.42], [-0.34, -0.04, 0.30], [0.34, 0, 0.30], [-0.18, 0.10, 0.40], [0.20, 0.08, 0.42]];
  for (const [bx, by, bz] of blobs) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 12), m);
    b.position.set(bx, by, bz);
    b.scale.set(0.34, 0.22, 0.34);
    g.add(b);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.userData = { baseX: x, baseY: y, phase: Math.random() * Math.PI * 2, speed: 0.10 + Math.random() * 0.10 };
  return g;
}
const clouds = [
  makeCloud(-3.2, 1.7, -2.2, 1.1),
  makeCloud(3.3, 2.3, -1.6, 1.4),
  makeCloud(2.6, 0.7, -3.4, 0.9),
];
clouds.forEach(c => scene.add(c));

// 径向渐变贴图工具（光晕 / 软阴影都用它画）
function radialTexture(inner, outer, size = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

// 暖光光晕
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: radialTexture('rgba(255,214,150,0.85)', 'rgba(255,180,90,0)'),
  color: 0xffcf9a,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
}));
glow.position.set(0, 0.15, 0);
glow.scale.set(4.6, 4.6, 1);
glow.renderOrder = 5;
scene.add(glow);

// 小羊脚下的软阴影（开灯时变淡）
const blobShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.1, 1.25),
  new THREE.MeshBasicMaterial({
    map: radialTexture('rgba(8,10,20,0.5)', 'rgba(8,10,20,0)'),
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  })
);
blobShadow.rotation.x = -Math.PI / 2;
blobShadow.position.set(0, -1.235, 0);
blobShadow.renderOrder = 2;
scene.add(blobShadow);

// 开灯后飘浮的小光尘
const DUST_N = 90;
const dustBase = new Float32Array(DUST_N * 3);
const dustSpeed = new Float32Array(DUST_N);
for (let i = 0; i < DUST_N; i++) {
  const r = 0.3 + Math.random() * 1.6;
  const a = Math.random() * Math.PI * 2;
  dustBase[i * 3] = Math.cos(a) * r;
  dustBase[i * 3 + 1] = -0.7 + Math.random() * 2.1;
  dustBase[i * 3 + 2] = Math.sin(a) * r;
  dustSpeed[i] = 0.10 + Math.random() * 0.22;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
const dustMat = new THREE.PointsMaterial({
  color: 0xffd9a3, size: 0.035, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
});
const dust = new THREE.Points(dustGeo, dustMat);
dust.position.set(0, 0.1, 0);
dust.renderOrder = 4;
scene.add(dust);

/* ============================================================
 * 状态
 * ============================================================ */
let isOn = true; // 开局亮着，第一眼看到暖暖的小羊
const T = { light: 2.8, emis: 0.55, glow: 0.9, dust: 0.55, shadow: 0.13 }; // 目标值
let lightCur = 2.8, emisCur = 0.55, glowCur = 0.9, dustCur = 0.55, shadowCur = 0.13;
let flash = 0;          // 开关瞬间的爆闪
let squashV = 0;        // 拍打形变速度（果冻弹簧）
let happy = 0;          // 开心表情剩余时间
let armBoost = 0;       // 小手欢呼幅度
let blinkTimer = 2.0;   // 下次眨眼
let blinkPhase = -1;    // 眨眼进度

const pill = document.getElementById('pill');
const hint = document.getElementById('hint');

function updatePill() {
  pill.textContent = isOn ? '💡 开灯啦' : '🌙 关灯啦';
  pill.className = isOn ? 'on' : '';
}
function hintDismiss() { hint.classList.add('gone'); }

/* ============================================================
 * 音频（WebAudio 现场合成，无需音频文件）
 * ============================================================ */
let actx = null;
function ensureAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { /* 忽略音频错误 */ }
}
function blip(freqStart, freqEnd, dur, vol, type, delay) {
  if (!actx) return;
  try {
    const t = actx.currentTime + (delay || 0);
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(Math.max(30, freqStart), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch (e) { /* 忽略音频错误 */ }
}
function playSound(on) {
  ensureAudio();
  if (!actx) return;
  blip(420, 120, 0.16, 0.3, 'sine');                       // "噗" 的拍打声
  blip(900, 200, 0.10, 0.12, 'triangle');
  if (on) {                                                 // 开灯时的小铃铛
    blip(760, 760, 0.28, 0.12, 'sine', 0.06);
    blip(1140, 1140, 0.34, 0.10, 'sine', 0.15);
  }
}

/* ============================================================
 * 交互
 * ============================================================ */
let theta = 0.55, phi = 0.30, radius = 5.6;   // 球坐标
let thetaVel = 0, phiVel = 0;                 // 惯性
let dragging = false, rotating = false;
let moved = 0, downTime = 0;
let lastX = 0, lastY = 0;
let lastInteract = 0;

const lookTarget = new THREE.Vector3(0, 0.12, 0);
const raycaster = new THREE.Raycaster();

function setCamera() {
  camera.position.set(
    lookTarget.x + radius * Math.cos(phi) * Math.sin(theta),
    lookTarget.y + radius * Math.sin(phi),
    lookTarget.z + radius * Math.cos(phi) * Math.cos(theta)
  );
  camera.lookAt(lookTarget);
}
setCamera();

function pickSheep(x, y) {
  const ndc = new THREE.Vector2(
    (x / window.innerWidth) * 2 - 1,
    -(y / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObjects(patTargets, false).length > 0;
}

renderer.domElement.addEventListener('pointerdown', e => {
  ensureAudio();
  dragging = true;
  rotating = false;
  moved = 0;
  downTime = performance.now();
  lastX = e.clientX; lastY = e.clientY;
  lastInteract = performance.now();
  renderer.domElement.setPointerCapture(e.pointerId);
  renderer.domElement.classList.add('dragging');
});

renderer.domElement.addEventListener('pointermove', e => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6) rotating = true;
    if (rotating) {
      theta -= dx * 0.0055;
      phi -= dy * 0.005;
      phi = Math.max(0.12, Math.min(1.32, phi));
      thetaVel = -dx * 0.0055;
      phiVel = -dy * 0.005;
      lastInteract = performance.now();
    }
  } else {
    // 悬停提示：摸到小羊就变小手
    renderer.domElement.style.cursor = pickSheep(e.clientX, e.clientY) ? 'pointer' : 'grab';
  }
});

renderer.domElement.addEventListener('pointerup', e => {
  dragging = false;
  renderer.domElement.classList.remove('dragging');
  if (!rotating && performance.now() - downTime < 400) {
    // 轻拍小羊
    if (pickSheep(e.clientX, e.clientY)) toggle();
  }
});

renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault();
  radius = Math.max(3.4, Math.min(8.5, radius * (1 + e.deltaY * 0.001)));
  lastInteract = performance.now();
}, { passive: false });

window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); toggle(); }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
 * 开关灯
 * ============================================================ */
function toggle() {
  isOn = !isOn;
  if (isOn) {
    T.light = 2.8; T.emis = 0.55; T.glow = 0.9; T.dust = 0.55; T.shadow = 0.13;
    flash = 2.2; // 开灯瞬间更亮一下
  } else {
    T.light = 0; T.emis = 0; T.glow = 0; T.dust = 0; T.shadow = 0.4;
    flash = 0;
  }
  squashV = -6;       // 拍打果冻形变
  happy = 0.55;       // 开心表情
  armBoost = 1;       // 小手欢呼
  updatePill();
  playSound(isOn);
  hintDismiss();
}

/* ============================================================
 * 主循环
 * ============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const now = performance.now();

  /* --- 平滑过渡 --- */
  const k = 1 - Math.exp(-6 * dt);
  lightCur += (T.light - lightCur) * k;
  emisCur += (T.emis - emisCur) * k;
  glowCur += (T.glow - glowCur) * k;
  dustCur += (T.dust - dustCur) * k;
  shadowCur += (T.shadow - shadowCur) * k;
  flash *= Math.exp(-5 * dt);

  lampLight.intensity = lightCur + flash;
  bodyMat.emissiveIntensity = emisCur;
  blobShadow.material.opacity = shadowCur;

  // 光晕呼吸
  glow.visible = glowCur > 0.01;
  if (glow.visible) {
    glow.material.opacity = glowCur;
    const gs = (4.4 + 0.35 * Math.sin(t * 1.4) + 0.25 * Math.sin(t * 2.6)) * (0.35 + 0.65 * glowCur);
    glow.scale.set(gs, gs, 1);
  }

  // 身边的小云朵慢慢飘，开灯时透出暖光
  for (const c of clouds) {
    c.position.x = c.userData.baseX + Math.sin(t * c.userData.speed + c.userData.phase) * 0.5;
    c.position.y = c.userData.baseY + Math.cos(t * c.userData.speed * 0.7 + c.userData.phase) * 0.25;
    c.children[0].material.emissiveIntensity = emisCur * 0.5;
  }

  /* --- 光尘漂浮 --- */
  dust.visible = dustCur > 0.01;
  if (dust.visible) {
    dust.material.opacity = dustCur;
    const pos = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST_N; i++) {
      const y = (dustBase[i * 3 + 1] + t * dustSpeed[i]) % 2.8 - 0.7;
      pos[i * 3] = dustBase[i * 3] + Math.sin(t * 0.6 + i) * 0.12;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = dustBase[i * 3 + 2] + Math.cos(t * 0.5 + i * 1.7) * 0.12;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.rotation.y = t * 0.05;
  }

  /* --- 漂浮与果冻形变 --- */
  eggWrap.position.y = -1.08 + Math.sin(t * 1.15) * 0.045;
  eggWrap.rotation.z = Math.sin(t * 0.75) * 0.022;

  squashV += (1 - eggGroup.scale.y) * 70 * dt;   // 回复力
  squashV *= Math.exp(-7 * dt);                  // 阻尼
  eggGroup.scale.y += squashV * dt;
  const sx = 1 + (1 - eggGroup.scale.y) * 0.5;   // 压扁时横向鼓出来
  eggGroup.scale.x = sx;
  eggGroup.scale.z = sx;

  /* --- 眨眼（豆豆眼一闪一闪） --- */
  blinkTimer -= dt;
  if (blinkTimer <= 0) { blinkPhase = 0; blinkTimer = 2.2 + Math.random() * 3.2; }
  if (blinkPhase >= 0) {
    blinkPhase += dt / 0.22;
    if (blinkPhase >= 1) { blinkPhase = -1; }
    else {
      const bk = 1 - 0.85 * Math.sin(blinkPhase * Math.PI);
      eyeL.scale.y = bk;
      eyeR.scale.y = bk;
    }
  }

  /* --- 表情与小手 --- */
  happy = Math.max(0, happy - dt);
  const eyeTarget = happy > 0 ? 1.25 : 1;        // 开心时眼睛睁得更大
  const ek = Math.min(1, dt * 12);
  if (blinkPhase < 0) {
    eyeL.scale.x += (eyeTarget - eyeL.scale.x) * ek;
    eyeR.scale.x += (eyeTarget - eyeR.scale.x) * ek;
    eyeL.scale.y += (eyeTarget - eyeL.scale.y) * ek;
    eyeR.scale.y += (eyeTarget - eyeR.scale.y) * ek;
  }
  const ms = happy > 0 ? 1.35 : 1;               // 开心时咧嘴
  mouth.scale.setScalar(mouth.scale.x + (ms - mouth.scale.x) * Math.min(1, dt * 12));

  armBoost *= Math.exp(-4 * dt);
  armL.rotation.z = 0.5 + Math.sin(t * 1.4) * 0.18 + armBoost * 0.7;
  armR.rotation.z = -0.5 + Math.sin(t * 1.4 + 1.7) * 0.18 - armBoost * 0.7;

  /* --- 相机：惯性 + 空闲自动环绕 --- */
  if (!dragging) {
    theta += thetaVel * dt;
    phi += phiVel * dt;
    phi = Math.max(0.12, Math.min(1.32, phi));
    thetaVel *= Math.exp(-3.5 * dt);
    phiVel *= Math.exp(-3.5 * dt);
    if (now - lastInteract > 8000) theta += 0.05 * dt; // 8 秒不动就慢慢转
  }
  lookTarget.y = 0.12 + Math.sin(t * 0.9) * 0.05;
  setCamera();

  renderer.render(scene, camera);
}

/* ---------- 启动 ---------- */
setCamera();
animate();
document.body.classList.add('ready');
