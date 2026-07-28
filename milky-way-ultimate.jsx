import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import * as Tone from "tone";

// ═══ MILKY WAY · ULTIMATE ═══
// Everything from the live model, plus:
//  · NIGHT SKY MODE — stand at the Sun and look around from inside the disc.
//    The "milky band", the glowing core toward Sagittarius, the dark Great
//    Rift of dust, the Magellanic Clouds hanging below the plane. This is
//    the actual reason it's called the Milky Way. Crank time and the whole
//    sky wheels as the Sun orbits.
//  · SUPERNOVAE — stars detonate in the arms at a rate tied to your time
//    dial, flaring white-hot with an expanding shock ring.
//  · SOUND — optional deep-space drone; each supernova rings a soft chime.
//  · Flat-rotation-curve orbits, guided tour, globular halo, satellite
//    galaxies, dust lanes, face-on/edge-on cinematics, fly-in.

const R = 14;
const BAR_LEN = 2.8;
const PITCH_B = 0.3;
const SUN_R = R * 0.55;

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeSoftTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(0.65, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeRingTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.62, "rgba(255,255,255,0)");
  g.addColorStop(0.74, "rgba(255,255,255,0.85)");
  g.addColorStop(0.85, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function armPoint(phase, u, spread) {
  const thetaMax = Math.log(R / BAR_LEN) / PITCH_B;
  const theta = u * thetaMax;
  const r = BAR_LEN * Math.exp(PITCH_B * theta);
  const angle = phase + theta;
  const sigma = (0.3 + r * 0.05) * spread;
  const off = gauss() * sigma;
  return {
    x: Math.cos(angle) * r - Math.sin(angle) * off,
    z: Math.sin(angle) * r + Math.cos(angle) * off,
    r, angle,
  };
}

const COL = {
  oldStar: new THREE.Color("#ffd9a3"),
  midStar: new THREE.Color("#fff3e0"),
  young: new THREE.Color("#9db8ff"),
  ob: new THREE.Color("#cfe0ff"),
  hii: new THREE.Color("#ff8fb0"),
  cluster: new THREE.Color("#ffe9c8"),
  lmc: new THREE.Color("#cdd9ff"),
};

function toGeometry(pts) {
  const n = pts.length / 8;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const siz = new Float32Array(n);
  const pha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([pts[i * 8], pts[i * 8 + 1], pts[i * 8 + 2]], i * 3);
    col.set([pts[i * 8 + 3], pts[i * 8 + 4], pts[i * 8 + 5]], i * 3);
    siz[i] = pts[i * 8 + 6];
    pha[i] = pts[i * 8 + 7];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(pha, 1));
  return geo;
}

function buildStars() {
  const pts = [];
  const tmp = new THREE.Color();
  const push = (x, y, z, c, b, s) =>
    pts.push(x, y, z, c.r * b, c.g * b, c.b * b, s, Math.random() * 6.283);

  for (let i = 0; i < 6000; i++) {
    const r = Math.abs(gauss()) * 1.1;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.62, r * Math.sin(ph) * Math.sin(th),
      COL.oldStar, 0.55 + Math.random() * 0.5, 0.7 + Math.random() * 0.9);
  }
  for (let i = 0; i < 8000; i++) {
    tmp.copy(COL.oldStar).lerp(COL.midStar, Math.random() * 0.4);
    push(gauss() * 2.1, gauss() * 0.34, gauss() * 0.42, tmp, 0.5 + Math.random() * 0.55, 0.6 + Math.random() * 0.9);
  }
  for (let i = 0; i < 15000; i++) {
    let r = -4.2 * Math.log(Math.random());
    if (r > R || r < 1.5) { i--; continue; }
    const a = Math.random() * Math.PI * 2;
    tmp.copy(COL.oldStar).lerp(COL.midStar, Math.min(r / R + Math.random() * 0.3, 1));
    push(Math.cos(a) * r, gauss() * 0.17, Math.sin(a) * r, tmp, 0.3 + Math.random() * 0.4, 0.55 + Math.random() * 0.7);
  }
  const arms = [
    { phase: 0, major: true },
    { phase: Math.PI, major: true },
    { phase: Math.PI * 0.5, major: false },
    { phase: Math.PI * 1.5, major: false },
  ];
  for (const arm of arms) {
    const n = arm.major ? 12000 : 6000;
    for (let i = 0; i < n; i++) {
      const u = Math.pow(Math.random(), 0.85);
      const p = armPoint(arm.phase, u, 1);
      const y = gauss() * (0.14 + 0.05 * (1 - u));
      const f = p.r / R;
      const roll = Math.random();
      let size = 0.6 + Math.random() * 0.9;
      let bright = 0.55 + Math.random() * 0.5;
      if (roll < 0.018 && f > 0.2) {
        tmp.copy(COL.hii); size = 1.4 + Math.random() * 1.4; bright = 0.9;
      } else if (roll < 0.05) {
        tmp.copy(COL.ob); size = 1.8 + Math.random() * 2.2; bright = 1.0;
      } else {
        tmp.copy(COL.midStar).lerp(COL.young, Math.min(f * 1.3, 1) * (arm.major ? 1 : 0.8));
      }
      push(p.x, y, p.z, tmp, bright * (arm.major ? 1 : 0.8), size);
    }
  }
  for (let c = 0; c < 60; c++) {
    const r = 3 + Math.random() * 15;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const cx = r * Math.sin(ph) * Math.cos(th);
    const cy = r * Math.cos(ph) * 0.8;
    const cz = r * Math.sin(ph) * Math.sin(th);
    for (let i = 0; i < 28; i++) {
      push(cx + gauss() * 0.16, cy + gauss() * 0.16, cz + gauss() * 0.16,
        COL.cluster, 0.45 + Math.random() * 0.4, 0.5 + Math.random() * 0.5);
    }
  }
  for (let i = 0; i < 900; i++) {
    tmp.copy(COL.lmc).lerp(COL.hii, Math.random() < 0.07 ? 0.8 : 0);
    push(20 + gauss() * 1.1 + (Math.random() - 0.5) * 1.6, -7 + gauss() * 0.5, 12 + gauss() * 0.9,
      tmp, 0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.8);
  }
  for (let i = 0; i < 450; i++) {
    push(25 + gauss() * 0.7, -10 + gauss() * 0.45, 17 + gauss() * 0.6,
      COL.lmc, 0.4 + Math.random() * 0.45, 0.45 + Math.random() * 0.7);
  }
  return toGeometry(pts);
}

function buildHaze() {
  const pts = [];
  const tmp = new THREE.Color();
  const arms = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
  for (let i = 0; i < 3200; i++) {
    let x, y, z, f;
    if (i < 1760) {
      const major = i % 4 < 2;
      const p = armPoint(arms[i % 4], Math.pow(Math.random(), 0.9), 1.4);
      x = p.x; z = p.z; f = p.r / R; y = gauss() * 0.3;
      tmp.copy(COL.midStar).lerp(COL.young, f * (major ? 0.9 : 0.6));
    } else {
      const r = Math.abs(gauss()) * 3.2;
      const a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      y = gauss() * (0.5 * Math.exp(-r * 0.4) + 0.15);
      f = r / R;
      tmp.copy(COL.oldStar).lerp(COL.midStar, f * 2);
    }
    const b = 0.05 + Math.random() * 0.06;
    pts.push(x, y, z, tmp.r * b, tmp.g * b, tmp.b * b, 5 + Math.random() * 7, Math.random() * 6.283);
  }
  for (let i = 0; i < 90; i++) {
    const lmc = i % 3 !== 2;
    const cx = lmc ? 20 : 25, cy = lmc ? -7 : -10, cz = lmc ? 12 : 17;
    const b = 0.03 + Math.random() * 0.03;
    pts.push(cx + gauss() * (lmc ? 1.2 : 0.7), cy + gauss() * 0.5, cz + gauss() * (lmc ? 0.9 : 0.6),
      COL.lmc.r * b, COL.lmc.g * b, COL.lmc.b * b, 4 + Math.random() * 4, Math.random() * 6.283);
  }
  return toGeometry(pts);
}

function buildDust() {
  const pts = [];
  const arms = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
  for (let i = 0; i < 15000; i++) {
    let x, y, z;
    if (i < 11700) {
      const armIdx = i % 4;
      if (armIdx >= 2 && Math.random() < 0.5) { i--; continue; }
      const u = Math.pow(Math.random(), 0.9);
      const thetaMax = Math.log(R / BAR_LEN) / PITCH_B;
      const theta = u * thetaMax;
      const r = BAR_LEN * Math.exp(PITCH_B * theta);
      const angle = arms[armIdx] + theta - 0.1 - Math.random() * 0.06;
      const off = gauss() * (0.16 + r * 0.02);
      x = Math.cos(angle) * r - Math.sin(angle) * off;
      z = Math.sin(angle) * r + Math.cos(angle) * off;
      y = gauss() * 0.08;
    } else {
      const r = 2.5 + Math.random() * 9;
      const a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = gauss() * 0.07;
    }
    const shade = 0.05 + Math.random() * 0.05;
    pts.push(x, y, z, shade * 1.4, shade * 0.85, shade * 0.6, 7 + Math.random() * 6, Math.random() * 6.283);
  }
  return toGeometry(pts);
}

function buildBackground() {
  const n = 3000;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 110 + Math.random() * 80;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return geo;
}

const VERT = `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  uniform float uRot;
  uniform float uPointScale;
  uniform float uMaxPoint;
  varying vec3 vColor;
  varying float vPhase;
  void main() {
    float r = length(position.xz);
    float omega = 1.0 / max(r, 0.9);
    float ang = -omega * uRot;
    float c = cos(ang), s = sin(ang);
    vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
    vColor = aColor;
    vPhase = aPhase;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min(aSize * (uPointScale / -mv.z), uMaxPoint);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG_ADD = `
  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uTwinkle;
  varying vec3 vColor;
  varying float vPhase;
  void main() {
    float tw = 1.0 + uTwinkle * 0.35 * sin(uTime * 2.5 + vPhase * 23.0);
    gl_FragColor = vec4(vColor * tw, 1.0) * texture2D(uTex, gl_PointCoord);
  }
`;
const FRAG_DUST = `
  uniform sampler2D uTex;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vPhase;
  void main() {
    float a = texture2D(uTex, gl_PointCoord).a * uOpacity;
    gl_FragColor = vec4(vColor, a);
  }
`;

const POIS = [
  { id: "core", name: "Sagittarius A*", blurb: "A 4.3-million-solar-mass black hole at the exact centre. Stars here whip around it at thousands of km/s.", target: [0, 0, 0], dist: 6.5, phi: 0.9 },
  { id: "bar", name: "The Bar", blurb: "A rotating bar of old amber stars ~27,000 ly long. The spiral arms launch from its tips.", target: [1.6, 0, 0.3], dist: 9, phi: 0.7 },
  { id: "scutum", name: "Scutum–Centaurus Arm", blurb: "One of the two dominant arms — dense with gas, dust lanes, and newborn blue stars.", arm: { phase: 0, u: 0.55 }, dist: 8, phi: 0.85 },
  { id: "perseus", name: "Perseus Arm", blurb: "The other major arm, home to famous nurseries like the Heart and Soul nebulae.", arm: { phase: Math.PI, u: 0.6 }, dist: 8, phi: 0.85 },
  { id: "sun", name: "The Sun · Orion Spur", blurb: "Our star, 26,000 ly out on a minor spur, one lap every ~230 million years. Watch it move.", target: "sun", dist: 5, phi: 1.0 },
  { id: "halo", name: "Globular Halo", blurb: "~150 ancient clusters swarming far above and below the disc — fossils of the galaxy's birth.", target: [0, 4, 0], dist: 36, phi: 1.25 },
  { id: "lmc", name: "Magellanic Clouds", blurb: "Two dwarf satellites, 160–200 thousand ly away, slowly being pulled apart by our gravity. From Johannesburg you can see them on any clear night.", target: [21.5, -8, 13.5], dist: 13, phi: 1.1 },
];

export default function MilkyWay() {
  const mountRef = useRef(null);
  const labelRef = useRef(null);
  const speedRef = useRef(0.5);
  const poiRef = useRef(null);
  const viewRef = useRef(null);
  const modeRef = useRef("orbit");
  const audioRef = useRef({ on: false, nodes: null });
  const [speedUi, setSpeedUi] = useState(0.5);
  const [activePoi, setActivePoi] = useState(null);
  const [mode, setMode] = useState("orbit");
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { speedRef.current = 0; }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020107");
    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.02, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const tex = makeSoftTexture();
    const ringTex = makeRingTexture();

    function layer(geo, frag, blending, order, opts = {}) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTex: { value: tex },
          uTime: { value: 0 },
          uRot: { value: 0 },
          uPointScale: { value: 190 },
          uMaxPoint: { value: 64 },
          uTwinkle: { value: opts.twinkle || 0 },
          uOpacity: { value: opts.opacity ?? 1 },
        },
        vertexShader: VERT, fragmentShader: frag,
        transparent: true, depthWrite: false, blending,
      });
      const p = new THREE.Points(geo, mat);
      p.renderOrder = order;
      scene.add(p);
      return mat;
    }

    const mats = [
      layer(buildHaze(), FRAG_ADD, THREE.AdditiveBlending, 0),
      layer(buildStars(), FRAG_ADD, THREE.AdditiveBlending, 1, { twinkle: 1 }),
      layer(buildDust(), FRAG_DUST, THREE.NormalBlending, 2, { opacity: 0.4 }),
    ];
    const dustMat = mats[2];

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(9.5, 5.2),
      new THREE.MeshBasicMaterial({ map: tex, color: 0xffdba6, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.renderOrder = 3;
    scene.add(glow);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xfff1d6, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.scale.set(2.6, 2.2, 1);
    core.renderOrder = 3;
    scene.add(core);

    scene.add(new THREE.Points(buildBackground(), new THREE.PointsMaterial({ size: 0.45, map: tex, color: 0x7788aa, transparent: true, opacity: 0.6, depthWrite: false, sizeAttenuation: true })));

    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffe28a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sun.renderOrder = 4;
    scene.add(sun);
    const sunTheta0 = Math.PI * 0.5 + Math.log(SUN_R / BAR_LEN) / PITCH_B + 0.18;

    const ringPts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * SUN_R, 0, Math.sin(a) * SUN_R));
    }
    const orbitRing = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.14 })
    );
    scene.add(orbitRing);

    // ——— Supernova pool ———
    const novas = [];
    for (let i = 0; i < 8; i++) {
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xeaf2ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      const shell = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: 0xaecbff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      flash.renderOrder = shell.renderOrder = 5;
      scene.add(flash, shell);
      novas.push({ flash, shell, active: false, born: 0, r: 0, baseAng: 0, y: 0 });
    }
    let nextNova = 2;

    function spawnNova(now, rotPhase) {
      const slot = novas.find((n) => !n.active);
      if (!slot) return;
      const armIdx = Math.floor(Math.random() * 4);
      const phases = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
      const p = armPoint(phases[armIdx], 0.25 + Math.random() * 0.65, 0.7);
      const omega = 1 / Math.max(p.r, 0.9);
      // store the angle as if rotPhase were zero, so it co-rotates with the disc
      const visAng = Math.atan2(p.z, p.x);
      slot.r = p.r;
      slot.baseAng = visAng + omega * rotPhase;
      slot.y = gauss() * 0.12;
      slot.born = now;
      slot.active = true;
      // chime
      const a = audioRef.current;
      if (a.on && a.nodes) {
        try {
          const semis = Math.floor(Math.random() * 12) - 4;
          a.nodes.synth.triggerAttackRelease(330 * Math.pow(2, semis / 12), 1.6, undefined, 0.25);
        } catch (e) {}
      }
    }

    // ——— Camera rig ———
    const cur = { theta: 0.4, phi: 0.35, dist: 75, target: new THREE.Vector3(), fov: 55 };
    const des = { theta: 0.7, phi: 1.0, dist: 26, target: new THREE.Vector3(), fov: 55 };
    const sky = { yaw: 0, pitch: 0.05, fov: 70, desFov: 70 };
    const state = { drag: false, lx: 0, ly: 0, pinch: 0, autoRotate: !prefersReduced };

    function applyOrbitCamera(dt) {
      const k = 1 - Math.exp(-dt * 3.5);
      cur.theta += (des.theta - cur.theta) * k;
      cur.phi += (des.phi - cur.phi) * k;
      cur.dist += (des.dist - cur.dist) * k;
      cur.fov += (55 - cur.fov) * k;
      cur.target.lerp(des.target, k);
      des.phi = Math.max(0.06, Math.min(Math.PI - 0.06, des.phi));
      des.dist = Math.max(3.5, Math.min(90, des.dist));
      camera.position.set(
        cur.target.x + cur.dist * Math.sin(cur.phi) * Math.cos(cur.theta),
        cur.target.y + cur.dist * Math.cos(cur.phi),
        cur.target.z + cur.dist * Math.sin(cur.phi) * Math.sin(cur.theta)
      );
      camera.fov = cur.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(cur.target);
    }

    const lookDir = new THREE.Vector3();
    function applySkyCamera(dt) {
      const k = 1 - Math.exp(-dt * 4);
      sky.fov += (sky.desFov - sky.fov) * k;
      sky.pitch = Math.max(-1.45, Math.min(1.45, sky.pitch));
      camera.position.copy(sun.position).add(new THREE.Vector3(0, 0.025, 0));
      lookDir.set(
        Math.cos(sky.pitch) * Math.cos(sky.yaw),
        Math.sin(sky.pitch),
        Math.cos(sky.pitch) * Math.sin(sky.yaw)
      );
      camera.fov = sky.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(camera.position.clone().add(lookDir));
    }

    function setMaxPoint(v) {
      for (const m of mats) m.uniforms.uMaxPoint.value = v;
    }

    function clearFocus() { poiRef.current = null; setActivePoi(null); }

    viewRef.current = {
      goPoi(poi) {
        if (modeRef.current === "sky") this.exitSky();
        poiRef.current = poi;
        setActivePoi(poi.id);
        let t;
        if (poi.target === "sun") t = sun.position.clone();
        else if (poi.arm) {
          const thetaMax = Math.log(R / BAR_LEN) / PITCH_B;
          const theta = poi.arm.u * thetaMax;
          const r = BAR_LEN * Math.exp(PITCH_B * theta);
          const a = poi.arm.phase + theta - (1 / Math.max(r, 0.9)) * rotPhase;
          t = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        } else t = new THREE.Vector3(...poi.target);
        des.target.copy(t);
        des.dist = poi.dist;
        des.phi = poi.phi;
      },
      view(kind) {
        if (modeRef.current === "sky") this.exitSky();
        clearFocus();
        des.target.set(0, 0, 0);
        if (kind === "face") { des.phi = 0.12; des.dist = 34; }
        else if (kind === "edge") { des.phi = Math.PI / 2 - 0.02; des.dist = 30; }
        else { des.phi = 1.0; des.dist = 26; }
      },
      home() {
        if (modeRef.current === "sky") this.exitSky();
        clearFocus();
        des.target.set(0, 0, 0); des.phi = 1.0; des.dist = 26;
      },
      enterSky() {
        clearFocus();
        modeRef.current = "sky";
        setMode("sky");
        // look toward the galactic centre first — the brightest part of the band
        const toCore = new THREE.Vector3().sub(sun.position).normalize();
        sky.yaw = Math.atan2(toCore.z, toCore.x);
        sky.pitch = 0.03;
        sky.fov = 95; sky.desFov = 70;
        sun.visible = false;
        orbitRing.visible = false;
        setMaxPoint(10);
        dustMat.uniforms.uOpacity.value = 0.3;
      },
      exitSky() {
        modeRef.current = "orbit";
        setMode("orbit");
        sun.visible = true;
        orbitRing.visible = true;
        setMaxPoint(64);
        dustMat.uniforms.uOpacity.value = 0.4;
        cur.target.copy(sun.position);
        cur.dist = 4; cur.phi = 1.0; cur.theta = sky.yaw + Math.PI;
        des.target.set(0, 0, 0); des.dist = 26; des.phi = 1.0; des.theta = cur.theta + 0.3;
      },
      async toggleSound() {
        const a = audioRef.current;
        if (!a.on) {
          try {
            await Tone.start();
            if (!a.nodes) {
              const vol = new Tone.Volume(-24).toDestination();
              const rev = new Tone.Reverb({ decay: 9, wet: 0.7 }).connect(vol);
              const d1 = new Tone.Oscillator(55, "sine").connect(rev);
              const d2 = new Tone.Oscillator(82.4, "sine").connect(rev);
              d1.volume.value = -18; d2.volume.value = -24;
              d1.start(); d2.start();
              const synth = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: { attack: 0.01, decay: 1.4, sustain: 0, release: 2.2 },
              }).connect(rev);
              synth.volume.value = -10;
              a.nodes = { vol, rev, d1, d2, synth };
            } else {
              a.nodes.d1.start(); a.nodes.d2.start();
            }
            a.on = true; setSoundOn(true);
          } catch (e) { console.error("Audio failed:", e); }
        } else {
          try { a.nodes.d1.stop(); a.nodes.d2.stop(); } catch (e) {}
          a.on = false; setSoundOn(false);
        }
      },
    };

    const el = renderer.domElement;
    el.style.touchAction = "none";
    const down = (e) => { state.drag = true; state.lx = e.clientX; state.ly = e.clientY; el.setPointerCapture && el.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (!state.drag) return;
      const dx = e.clientX - state.lx, dy = e.clientY - state.ly;
      state.lx = e.clientX; state.ly = e.clientY;
      if (modeRef.current === "sky") {
        sky.yaw -= dx * 0.0026 * (sky.fov / 70);
        sky.pitch += dy * 0.0026 * (sky.fov / 70);
      } else {
        des.theta += dx * 0.005;
        des.phi -= dy * 0.005;
      }
    };
    const up = () => { state.drag = false; };
    const wheel = (e) => {
      e.preventDefault();
      if (modeRef.current === "sky") sky.desFov = Math.max(28, Math.min(100, sky.desFov * (1 + Math.sign(e.deltaY) * 0.08)));
      else des.dist *= 1 + Math.sign(e.deltaY) * 0.1;
    };
    const tStart = (e) => {
      if (e.touches.length === 2) state.pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const tMove = (e) => {
      if (e.touches.length === 2 && state.pinch > 0) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (modeRef.current === "sky") sky.desFov = Math.max(28, Math.min(100, sky.desFov * state.pinch / d));
        else des.dist *= state.pinch / d;
        state.pinch = d;
      }
    };
    const tEnd = () => { state.pinch = 0; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", tStart, { passive: true });
    el.addEventListener("touchmove", tMove, { passive: false });
    el.addEventListener("touchend", tEnd);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf, simTime = 0, rotPhase = 0;
    const clock = new THREE.Clock();
    const proj = new THREE.Vector3();

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      simTime += dt;
      rotPhase += dt * speedRef.current;

      for (const m of mats) {
        m.uniforms.uTime.value = simTime;
        m.uniforms.uRot.value = rotPhase;
      }

      const sunAng = sunTheta0 - (1 / SUN_R) * rotPhase;
      sun.position.set(Math.cos(sunAng) * SUN_R, 0.04, Math.sin(sunAng) * SUN_R);
      const pulse = 0.45 + Math.sin(simTime * 2.2) * 0.08;
      sun.scale.set(pulse, pulse, 1);

      // supernovae — rate scales with how fast time is running
      if (speedRef.current > 0.05 && simTime > nextNova) {
        spawnNova(simTime, rotPhase);
        nextNova = simTime + (2 + Math.random() * 4) / Math.max(speedRef.current * 0.4, 0.08);
      }
      for (const n of novas) {
        if (!n.active) continue;
        const age = simTime - n.born;
        const life = 2.6;
        if (age > life) { n.active = false; n.flash.material.opacity = 0; n.shell.material.opacity = 0; continue; }
        const omega = 1 / Math.max(n.r, 0.9);
        const a = n.baseAng - omega * rotPhase;
        const x = Math.cos(a) * n.r, z = Math.sin(a) * n.r;
        n.flash.position.set(x, n.y, z);
        n.shell.position.set(x, n.y, z);
        const f = age / life;
        const flare = f < 0.12 ? f / 0.12 : Math.pow(1 - (f - 0.12) / 0.88, 1.6);
        n.flash.material.opacity = flare;
        const fs = 0.25 + flare * 1.6;
        n.flash.scale.set(fs, fs, 1);
        n.shell.material.opacity = Math.max(0, 0.7 * (1 - f)) * (f > 0.08 ? 1 : 0);
        const ss = 0.3 + f * 3.6;
        n.shell.scale.set(ss, ss, 1);
      }

      if (!state.drag && !poiRef.current && modeRef.current === "orbit" && state.autoRotate && !prefersReduced) des.theta += dt * 0.03;
      if (poiRef.current && poiRef.current.target === "sun") des.target.copy(sun.position);

      if (modeRef.current === "sky") applySkyCamera(dt);
      else applyOrbitCamera(dt);

      if (labelRef.current) {
        if (modeRef.current === "sky" || !sun.visible) {
          labelRef.current.style.opacity = "0";
        } else {
          proj.copy(sun.position).project(camera);
          labelRef.current.style.transform = `translate(${(proj.x * 0.5 + 0.5) * mount.clientWidth}px, ${(-proj.y * 0.5 + 0.5) * mount.clientHeight}px)`;
          labelRef.current.style.opacity = proj.z < 1 ? "1" : "0";
        }
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", tStart);
      el.removeEventListener("touchmove", tMove);
      el.removeEventListener("touchend", tEnd);
      const a = audioRef.current;
      if (a.nodes) {
        try {
          a.nodes.d1.stop(); a.nodes.d2.stop();
          Object.values(a.nodes).forEach((nn) => nn.dispose && nn.dispose());
        } catch (e) {}
      }
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      tex.dispose(); ringTex.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const myrPerSec = Math.round(4.76 * speedUi * 10) / 10;
  const poi = POIS.find((p) => p.id === activePoi);
  const inSky = mode === "sky";

  const chipStyle = (active, accent) => ({
    flex: "0 0 auto",
    background: active ? "rgba(255,226,138,0.14)" : accent ? "rgba(157,184,255,0.1)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${active ? "rgba(255,226,138,0.55)" : accent ? "rgba(157,184,255,0.5)" : "rgba(154,151,171,0.3)"}`,
    color: active ? "#ffe28a" : accent ? "#bcd0ff" : "#c9c6d8",
    padding: "7px 12px",
    fontSize: 10.5,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    borderRadius: 2,
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#020107", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      <div ref={labelRef} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", transition: "opacity 0.3s", color: "#ffe28a", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        <div style={{ transform: "translate(10px, -18px)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 22, height: 1, background: "rgba(255,226,138,0.6)" }} />
          Sun
        </div>
      </div>

      <div style={{ position: "absolute", top: 20, left: 20, color: "#e8e6f0", pointerEvents: "none" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase", opacity: 0.55, marginBottom: 5 }}>
          {inSky ? "View from the Sun · this is why it's 'milky'" : "Live model · flat rotation curve"}
        </div>
        <div style={{ fontSize: 26, fontWeight: 200, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Milky Way
        </div>
      </div>

      <div style={{ position: "absolute", top: 20, right: 20, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {!inSky && [["oblique", "Oblique"], ["face", "Face-on"], ["edge", "Edge-on"]].map(([k, label]) => (
          <button key={k} onClick={() => viewRef.current && viewRef.current.view(k)} style={chipStyle(false)}>
            {label}
          </button>
        ))}
        <button
          onClick={() => viewRef.current && (inSky ? viewRef.current.exitSky() : viewRef.current.enterSky())}
          style={chipStyle(false, true)}
        >
          {inSky ? "↩ Back to space" : "✦ Night sky — view from Earth"}
        </button>
        <button onClick={() => viewRef.current && viewRef.current.toggleSound()} style={chipStyle(soundOn)}>
          {soundOn ? "♪ Sound on" : "♪ Sound off"}
        </button>
      </div>

      <div style={{ position: "absolute", right: 20, bottom: inSky ? 24 : 118, color: "#9a97ab", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "right" }}>
        <div style={{ marginBottom: 4 }}>
          Time · {myrPerSec === 0 ? "paused" : `≈ ${myrPerSec} Myr/s`}
        </div>
        <input
          type="range" min="0" max="20" step="0.1" value={speedUi}
          onChange={(e) => { const v = parseFloat(e.target.value); setSpeedUi(v); speedRef.current = v; }}
          style={{ width: 150, accentColor: "#ffe28a" }}
          aria-label="Time speed"
        />
        <div style={{ opacity: 0.55, marginTop: 2, fontSize: 9 }}>
          {inSky ? "Crank it — watch the sky wheel" : "Crank it — supernovae & winding arms"}
        </div>
      </div>

      {inSky && (
        <div style={{ position: "absolute", left: 20, bottom: 24, color: "#9a97ab", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.9, pointerEvents: "none" }}>
          Drag to look around · pinch to zoom
          <br />
          Find: the bright core · the dark rift · two faint clouds below the band
        </div>
      )}

      {!inSky && poi && (
        <div style={{ position: "absolute", left: 20, right: 20, bottom: 64, maxWidth: 420, background: "rgba(5,4,14,0.78)", border: "1px solid rgba(255,226,138,0.25)", borderRadius: 3, padding: "12px 14px", color: "#dcd9e8", backdropFilter: "blur(6px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ffe28a" }}>{poi.name}</div>
            <button onClick={() => viewRef.current && viewRef.current.home()} style={{ background: "none", border: "none", color: "#9a97ab", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em" }}>
              ✕ Back
            </button>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 300 }}>{poi.blurb}</div>
        </div>
      )}

      {!inSky && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, display: "flex", gap: 8, overflowX: "auto", padding: "4px 20px", WebkitOverflowScrolling: "touch" }}>
          {POIS.map((p) => (
            <button key={p.id} onClick={() => viewRef.current && viewRef.current.goPoi(p)} style={chipStyle(activePoi === p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
