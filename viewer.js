/* UMBRA Atelier · visor 3D de la rueda (Three.js r170, modelo exportado desde Blender). */
import * as THREE from 'three';
import { GLTFLoader } from './GLTFLoader.js';
import { DRACOLoader } from './DRACOLoader.js';

const MATS = {
  LABIO_PULIDO: { color: 0xeeeef0, metalness: 1, roughness: 0.06 },
  RADIO_CEPILLADO: { color: 0xd2d4d8, metalness: 1, roughness: 0.3 },
  CORONA_TORNEADA: { color: 0xcacccf, metalness: 1, roughness: 0.24 },
  BARRIL_SATINADO: { color: 0x8e9095, metalness: 1, roughness: 0.42 },
  TORNILLO: { color: 0xc4c6ca, metalness: 1, roughness: 0.16 },
  TUERCA: { color: 0x2a2b2e, metalness: 1, roughness: 0.34 },
  HUECO: { color: 0x000000, metalness: 0, roughness: 0.7 },
  GRABADO: { color: 0x060606, metalness: 0, roughness: 0.5 },
  NEUMATICO: { color: 0x151515, metalness: 0, roughness: 0.82 },
  PINZA_ROJA: { color: 0xb3200f, metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 },
  LETRAS_PINZA: { color: 0x0a0a0a, metalness: 0, roughness: 0.4 },
  CARBOCERAMICO: { color: 0x48484b, metalness: 0.3, roughness: 0.62 },
  CAMPANA: { color: 0x1a1a1d, metalness: 1, roughness: 0.36 },
  ESCUDO_FRENO: { color: 0x121214, metalness: 0.8, roughness: 0.55 },
  PASTILLA: { color: 0x1b1b1b, metalness: 0, roughness: 0.9 }
};
// apertura extra al elegir una pieza, para que se vea mejor
const FOCUS = {
  labio: { Labio: 0.10, Valvula: 0.10 },
  corona: { Tapa: 0.10, Centro: 0.10, Tornillos: 0.10, Tuercas: 0.10 },
  centro: { Tapa: 0.12, Centro: 0.12, Tornillos: 0.12, Tuercas: 0.12 },
  tapa: { Tapa: 0.18 },
  pinza: { Tapa: 0.5, Centro: 0.38, Tornillos: 0.38, Tuercas: 0.38, Labio: 0.22, Valvula: 0.22, Neumatico: 0.1 },
  disco: { Tapa: 0.5, Centro: 0.38, Tornillos: 0.38, Tuercas: 0.38, Labio: 0.22, Valvula: 0.22, Neumatico: 0.1 }
};
// giro con el que se presenta cada pieza (en radianes: guiñada, inclinación)
const VIEW = { labio: [-0.32, 0.12], corona: [0.3, 0.14], centro: [-0.18, 0.06], tapa: [0, 0], pinza: [0.62, 0.05], disco: [-0.55, 0.05] };
const K = 0.75; // escala de la apertura en el visor

// estudio para los reflejos: sala oscura, suelo de hormigón y tiras de luz, como en la película
function studioEnvironment() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 14), new THREE.MeshBasicMaterial({ color: 0x0b0b0c, side: THREE.BackSide }));
  room.position.y = 2.5; env.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0x3a3a3c }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.9; env.add(floor);
  const glow = (w, h, s) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(s), side: THREE.DoubleSide }));
  const top = glow(6, 2.2, 7); top.rotation.x = Math.PI / 2; top.position.set(0, 6.8, 0.6); env.add(top);
  const left = glow(0.35, 5.5, 9); left.position.set(-4.2, 1.6, 2.4); left.lookAt(0, 0, 0); env.add(left);
  const right = glow(0.35, 5.5, 6); right.position.set(4.4, 1.4, 1.2); right.lookAt(0, 0, 0); env.add(right);
  const back = glow(9, 0.25, 5); back.position.set(0, 2.6, -6.6); env.add(back);
  const wall = glow(10, 4, 0.55); wall.position.set(0, 1.0, -6.9); env.add(wall);
  return env;
}

export async function createViewer(host, { parts, explode, onProgress, onDeg, hotspots }) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.insertBefore(renderer.domElement, host.querySelector('.viewer__load'));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment(), 0.02).texture;
  scene.environmentIntensity = 1.0;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.4, 2.2, 2.6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(-2.2, 1.2, -1.6); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  camera.position.set(0, 0, 1.9);

  const outer = new THREE.Group(); scene.add(outer);
  const inner = new THREE.Group();
  // del sistema del modelo (eje de la rueda en +Y) al del visor (eje hacia la cámara, texto derecho)
  inner.setRotationFromMatrix(new THREE.Matrix4().set(0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  outer.add(inner);

  const draco = new DRACOLoader().setDecoderPath('./');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync('umbra-rueda.glb', e => { if (e.total) onProgress(e.loaded / e.total); });
  inner.add(gltf.scene);
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const name = o.material && o.material.name;
    const spec = MATS[name];
    if (spec) { const m = new THREE.MeshPhysicalMaterial(spec); m.name = name; o.material = m; }
  });
  const nodes = {};
  Object.keys(explode).concat(['Pinza', 'Pinza_Letras', 'Pastillas', 'Disco', 'Campana', 'Escudo']).forEach(n => {
    const o = gltf.scene.getObjectByName('Rueda_' + n); if (o) nodes[n] = o;
  });

  // anclas de las marcas, en el marco del visor
  const anchors = parts.map(p => { const a = new THREE.Object3D(); a.position.set(...p.at); a.userData.base = new THREE.Vector3(...p.at); a.userData.out = p.out; outer.add(a); return a; });

  // estado
  let expl = 0, focusId = parts[0].id;
  const off = {}; Object.keys(nodes).forEach(n => { off[n] = 0; });
  let yaw = 0, tilt = 0, tYaw = 0, tTilt = 0, vYaw = 0, dragging = false, lastInteract = -1e9, visible = true, raf = null, last = 0, t = 0;

  function targetsFor(n) {
    const base = (explode[n] || 0) * expl;
    const f = (FOCUS[focusId] && FOCUS[focusId][n]) || 0;
    return Math.max(base, f * (1 - expl)) * K;
  }

  const v3 = new THREE.Vector3(), nrm = new THREE.Vector3();
  const hsCache = hotspots.map(() => ({ x: -1, y: -1, back: null }));
  function placeHotspots(w, h) {
    anchors.forEach((a, i) => {
      const extra = a.userData.out * expl * K;
      a.position.copy(a.userData.base); a.position.z += extra;
      a.getWorldPosition(v3); v3.project(camera);
      const x = Math.round((v3.x * 0.5 + 0.5) * w * 2) / 2, y = Math.round((0.5 - v3.y * 0.5) * h * 2) / 2;
      nrm.set(0, 0, 1).applyQuaternion(outer.quaternion);
      const back = nrm.z < 0.05;
      const c = hsCache[i];
      if (x !== c.x || y !== c.y) { hotspots[i].style.transform = `translate3d(${x}px,${y}px,0)`; c.x = x; c.y = y; }
      if (back !== c.back) { hotspots[i].classList.toggle('is-back', back); c.back = back; }
    });
  }

  let W = 0, H = 0;
  function resize() {
    W = host.clientWidth; H = host.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    kick();
  }
  new ResizeObserver(resize).observe(host);

  let lastDeg = '';
  function frame(now) {
    const dt = Math.min(64, now - (last || now)); last = now; t += dt / 1000;
    const k = (r) => 1 - Math.pow(1 - r, dt / 16.667);
    // giro: inercia al soltar, vaivén lento en reposo, giro de presentación al abrir
    if (!dragging) {
      if (Math.abs(vYaw) > 0.00005) { tYaw += vYaw * dt; vYaw *= Math.pow(0.92, dt / 16.667); }
      const idle = now - lastInteract > 6000 && !RM.matches;
      if (idle) tYaw += ((VIEW[focusId][0] + Math.sin(t * 0.35) * 0.22 + expl * 0.85) - tYaw) * k(0.02);
    }
    yaw += (tYaw - yaw) * k(0.12); tilt += (tTilt - tilt) * k(0.12);
    outer.rotation.set(tilt, yaw, 0);
    outer.position.x = -0.16 * expl;
    camera.position.z = 1.9 + 0.55 * expl;
    let moving = Math.abs(tYaw - yaw) > 0.0004 || Math.abs(tTilt - tilt) > 0.0004 || dragging || Math.abs(vYaw) > 0.00005;
    Object.keys(nodes).forEach(n => {
      const tg = targetsFor(n); off[n] += (tg - off[n]) * k(0.14);
      if (Math.abs(tg - off[n]) > 0.0004) moving = true; else off[n] = tg;
      nodes[n].position.y = off[n];
    });
    renderer.render(scene, camera);
    placeHotspots(W, H);
    const d = `${Math.round(((yaw * 180 / Math.PI) % 360 + 360) % 360)}|${Math.round(tilt * 180 / Math.PI)}`;
    if (d !== lastDeg) { lastDeg = d; const [a, b] = d.split('|'); onDeg(Number(a), Number(b)); }
    const idleSway = !RM.matches && !dragging && now - lastInteract > 6000;
    raf = visible && !document.hidden && (moving || idleSway) ? requestAnimationFrame(frame) : null;
    if (!raf) last = 0;
  }
  function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(host);
  document.addEventListener('visibilitychange', kick);

  // arrastrar para girar (en táctil solo el gesto horizontal, el vertical sigue siendo scroll)
  let px = 0, py = 0, pid = null, lastMoveT = 0;
  host.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    pid = e.pointerId; dragging = true; px = e.clientX; py = e.clientY; vYaw = 0; lastMoveT = performance.now();
    try { host.setPointerCapture(pid); } catch (err) {}
    host.classList.add('dragging'); lastInteract = performance.now(); kick();
  });
  host.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - px, dy = e.clientY - py, now = performance.now(), dtm = Math.max(1, now - lastMoveT);
    px = e.clientX; py = e.clientY; lastMoveT = now;
    tYaw += dx * 0.008; tTilt = Math.max(-0.4, Math.min(0.4, tTilt + dy * 0.004));
    vYaw = (dx * 0.008) / dtm; lastInteract = now; kick();
  });
  const end = e => { if (!dragging || (e && e.pointerId !== pid)) return; dragging = false; host.classList.remove('dragging'); lastInteract = performance.now(); kick(); };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);

  resize();
  return {
    setExplode(p) { expl = p; kick(); },
    focus(id) { focusId = id; const v = VIEW[id] || [0, 0]; tYaw = v[0] + expl * 0.85; tTilt = v[1]; lastInteract = performance.now(); kick(); }
  };
}
