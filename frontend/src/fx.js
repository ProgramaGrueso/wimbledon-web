/**
 * Capa de efectos de Halloween (web cliente y panel admin).
 * - Telón de entrada con titileo, brasas 3D (Three.js) que reaccionan al mouse y al scroll
 * - Barra de progreso, relámpagos suaves, murciélagos que cruzan, botones magnéticos
 * - Inclinación 3D en tarjetas, titulares que se revelan por líneas, parallax de imágenes
 * Todo se apaga con prefers-reduced-motion; three se carga aparte para no frenar la primera pintura.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const calmado = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

/* ---------- Telón de entrada ---------- */
export function initTelon(texto = 'WIMBLEDON') {
  if (calmado() || sessionStorage.getItem('wb_telon')) return Promise.resolve();
  try { sessionStorage.setItem('wb_telon', '1'); } catch { /* sin almacenamiento */ }
  const t = document.createElement('div');
  t.className = 'fx-telon';
  t.innerHTML = `<div class="fx-telon__marca"><span class="fx-telon__ojo"></span><b>${texto}</b><i>Noche de brujas</i></div>`;
  document.body.appendChild(t);
  document.documentElement.classList.add('fx-bloqueado');
  return new Promise((ok) => {
    const tl = gsap.timeline({ onComplete: () => { t.remove(); document.documentElement.classList.remove('fx-bloqueado'); ok(); } });
    tl.fromTo('.fx-telon__marca b', { opacity: 0, letterSpacing: '1.2em', filter: 'blur(12px)' }, { opacity: 1, letterSpacing: '0.35em', filter: 'blur(0px)', duration: 1.1, ease: 'power3.out' })
      .fromTo('.fx-telon__ojo', { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.1)
      .fromTo('.fx-telon__marca i', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.7)
      .to('.fx-telon__marca b', { opacity: 0.35, duration: 0.05, yoyo: true, repeat: 5, ease: 'steps(1)' }, 1.0)
      .to('.fx-telon__marca', { scale: 1.08, opacity: 0, duration: 0.6, ease: 'power2.in' }, '+=0.15')
      .to(t, { clipPath: 'circle(0% at 50% 50%)', duration: 0.9, ease: 'power3.inOut' }, '-=0.25');
  });
}

/* ---------- Progreso de scroll ---------- */
export function initProgreso() {
  const b = document.createElement('div');
  b.className = 'fx-progreso';
  b.setAttribute('aria-hidden', 'true');
  document.body.appendChild(b);
  gsap.to(b, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
}

/* ---------- Brasas 3D ---------- */
export async function initBrasas({ intensidad = 1 } = {}) {
  if (calmado()) return;
  let THREE;
  try { THREE = await import('three'); } catch { return; }
  const lienzo = document.createElement('canvas');
  lienzo.className = 'fx-brasas';
  lienzo.setAttribute('aria-hidden', 'true');
  document.body.appendChild(lienzo);
  let r;
  try {
    r = new THREE.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch { lienzo.remove(); return; }
  const movil = tactil();
  r.setPixelRatio(movil ? 0.75 : Math.min(window.devicePixelRatio, 1.5));
  const escena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  cam.position.z = 14;

  const N = Math.round((movil ? 180 : 420) * intensidad);
  const pos = new Float32Array(N * 3), sem = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    sem[i * 3] = Math.random(); sem[i * 3 + 1] = Math.random(); sem[i * 3 + 2] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(sem, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, mouse: { value: new THREE.Vector2(0, 0) }, scroll: { value: 0 }, px: { value: r.getPixelRatio() } },
    vertexShader: `
      attribute vec3 seed; uniform float t, scroll, px; uniform vec2 mouse;
      varying float vA; varying float vH;
      void main(){
        vec3 p = position;
        float sp = 0.25 + seed.x * 0.9;
        p.y = mod(p.y + t * sp + scroll * (2.0 + seed.z * 6.0) + 11.0, 22.0) - 11.0;
        p.x += sin(t * 0.5 + seed.y * 40.0) * (0.6 + seed.z);
        p.z += cos(t * 0.35 + seed.x * 30.0) * 0.8;
        vec2 d = p.xy - mouse * vec2(15.0, 9.0);
        float m = smoothstep(4.5, 0.0, length(d));
        p.xy += normalize(d + 0.0001) * m * 2.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + seed.z * 5.0 + m * 5.0) * px * (14.0 / -mv.z);
        vA = (0.25 + 0.75 * abs(sin(t * (0.6 + seed.x) + seed.y * 20.0))) * smoothstep(11.0, 7.0, abs(p.y));
        vH = seed.y;
      }`,
    fragmentShader: `
      varying float vA; varying float vH;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 naranja = vec3(1.0, 0.45, 0.08), dorado = vec3(1.0, 0.78, 0.35), violeta = vec3(0.62, 0.35, 1.0);
        vec3 c = vH < 0.6 ? mix(naranja, dorado, vH / 0.6) : violeta;
        gl_FragColor = vec4(c * pow(a, 1.6), pow(a, 1.6) * vA * 0.8);
      }`,
  });
  escena.add(new THREE.Points(g, mat));

  const ajustar = () => {
    r.setSize(innerWidth, innerHeight, false);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  };
  ajustar();
  window.addEventListener('resize', ajustar, { passive: true });

  const objetivo = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    objetivo.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  }, { passive: true });
  let scrollY = 0, vel = 0;
  window.addEventListener('scroll', () => {
    vel += (window.scrollY - scrollY) * 0.0004;
    scrollY = window.scrollY;
  }, { passive: true });

  let activo = true, ultimo = performance.now();
  document.addEventListener('visibilitychange', () => { activo = !document.hidden; ultimo = performance.now(); if (activo) requestAnimationFrame(bucle); });
  function bucle(now) {
    if (!activo) return;
    const dt = Math.min(0.05, (now - ultimo) / 1000);
    ultimo = now;
    mat.uniforms.t.value += dt;
    mat.uniforms.mouse.value.lerp(objetivo, 0.06);
    vel *= 0.92;
    mat.uniforms.scroll.value += vel * dt * 60;
    cam.position.x += (mat.uniforms.mouse.value.x * 1.2 - cam.position.x) * 0.04;
    cam.position.y += (mat.uniforms.mouse.value.y * 0.8 - cam.position.y) * 0.04;
    cam.lookAt(0, 0, 0);
    r.render(escena, cam);
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);
}

/* ---------- Relámpagos y murciélagos ---------- */
export function initAmbiente() {
  if (calmado()) return;
  const flash = document.createElement('div');
  flash.className = 'fx-relampago';
  flash.setAttribute('aria-hidden', 'true');
  document.body.appendChild(flash);
  const relampago = () => {
    gsap.timeline()
      .to(flash, { opacity: 0.22, duration: 0.05 })
      .to(flash, { opacity: 0.04, duration: 0.08 })
      .to(flash, { opacity: 0.3, duration: 0.04 })
      .to(flash, { opacity: 0, duration: 0.7, ease: 'power2.out' });
    setTimeout(relampago, 22000 + Math.random() * 30000);
  };
  setTimeout(relampago, 9000 + Math.random() * 8000);

  const murcielago = () => {
    if (document.hidden) { setTimeout(murcielago, 8000); return; }
    const b = document.createElement('span');
    b.className = 'fx-murcielago';
    b.setAttribute('aria-hidden', 'true');
    const ltr = Math.random() > 0.5;
    const y0 = 8 + Math.random() * 45;
    b.style.top = y0 + 'vh';
    document.body.appendChild(b);
    gsap.fromTo(b, { x: ltr ? '-12vw' : '112vw', y: 0, scaleX: ltr ? 1 : -1, scaleY: 1, rotation: 0 },
      { x: ltr ? '112vw' : '-12vw', duration: 7 + Math.random() * 4, ease: 'none', onComplete: () => b.remove() });
    gsap.to(b, { y: () => (Math.random() - 0.5) * 120, duration: 1.1, repeat: 8, yoyo: true, ease: 'sine.inOut' });
    gsap.to(b, { scaleY: 0.55, duration: 0.12, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    setTimeout(murcielago, 16000 + Math.random() * 20000);
  };
  setTimeout(murcielago, 5000);
}

/* ---------- Interacciones ---------- */
export function initInteracciones(raiz = document) {
  if (calmado()) return;
  // Titulares: entran por líneas con máscara
  raiz.querySelectorAll('h2.editorial-headline:not([data-fx])').forEach((h) => {
    h.dataset.fx = '1';
    gsap.from(h, {
      yPercent: 40, opacity: 0, filter: 'blur(10px)', duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: h, start: 'top 88%', once: true },
    });
  });
  // Imágenes grandes: parallax suave
  raiz.querySelectorAll('.hero-slide-bg, .cta-cinematic-media, .decoracion-card img').forEach((img) => {
    if (img.dataset.fx) return;
    img.dataset.fx = '1';
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  if (tactil()) return;
  // Botones magnéticos + brillo que sigue al mouse
  raiz.querySelectorAll('.btn-hero-primary, .btn-editorial, .btn-editorial-light, .btn-compact-reserve, .btn-grid-book').forEach((b) => {
    if (b.dataset.fxm) return;
    b.dataset.fxm = '1';
    const qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' });
    const qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      qx((e.clientX - r.left - r.width / 2) * 0.22);
      qy((e.clientY - r.top - r.height / 2) * 0.28);
      b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    });
    b.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
  // Tarjetas con inclinación 3D y brillo
  raiz.querySelectorAll('.suite-card-compact, .suite-grid-card, .gastro-card, .testimonial-card, .analytics-panel-card, .kpi-luxe-card, .rack-room-card').forEach((c) => {
    if (c.dataset.fxt) return;
    c.dataset.fxt = '1';
    c.classList.add('fx-tilt');
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
      c.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
      c.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      c.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
  });
}

/** Re-aplica efectos a contenido que se dibuja después (carruseles, panel admin). */
export function observarNuevos(raiz) {
  let espera = null;
  new MutationObserver(() => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      initInteracciones(raiz);
      ScrollTrigger.refresh();
    }, 120);
  }).observe(raiz, { childList: true, subtree: true });
}
