import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';
gsap.registerPlugin(ScrollTrigger);
let activeLenis = null;

/** Desplaza a una sección respetando Lenis (un scrollIntoView nativo pelea con él). */
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (activeLenis) activeLenis.scrollTo(el, { offset: -70 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function initSmoothScroll(options = {}) {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
    ...options,
  });
  activeLenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  const updateRaf = (time) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(updateRaf);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(updateRaf);
    lenis.off('scroll', ScrollTrigger.update);
    lenis.destroy();
    activeLenis = null;
  };
}
export function initHeroPinAnimation() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    const heroContent = document.getElementById('heroEditorialContent');
    if (!heroContent) return;
    
    // Revelado y desvanecimiento suave al hacer scroll sin bloquear la página
    gsap.to(heroContent, {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.0,
      },
      y: 60,
      opacity: 0.2,
      ease: 'power1.out',
    });
    
    return () => {
      gsap.set(heroContent, { clearProps: 'all' });
    };
  });
  return mm;
}
export function initServicesAccordion() {
  const sectionToggle = document.getElementById('btnToggleServicesSection');
  const mainPanel = document.getElementById('servicesMainPanel');
  const toggleStatus = document.getElementById('servicesToggleStatus');
  const toggleLabel = document.getElementById('servicesToggleLabel');

  if (sectionToggle && mainPanel) {
    sectionToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isExpanded = sectionToggle.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        sectionToggle.setAttribute('aria-expanded', 'false');
        sectionToggle.classList.remove('is-open');
        mainPanel.hidden = true;
        if (toggleStatus) toggleStatus.textContent = 'Oculto';
        if (toggleLabel) toggleLabel.textContent = 'Ver las 6 Amenidades & Servicios Exclusivos';
      } else {
        sectionToggle.setAttribute('aria-expanded', 'true');
        sectionToggle.classList.add('is-open');
        mainPanel.hidden = false;
        if (toggleStatus) toggleStatus.textContent = 'Activo';
        if (toggleLabel) toggleLabel.textContent = 'Ocultar Amenidades & Servicios Exclusivos';

        gsap.fromTo(
          mainPanel,
          { opacity: 0, y: -16 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
        );
      }

      ScrollTrigger.refresh();
    });
  }

  const items = document.querySelectorAll('.service-item');
  if (!items.length) return;

  items.forEach((item) => {
    const trigger = item.querySelector('.service-trigger');
    const drawer = item.querySelector('.service-detail-drawer');
    if (!trigger || !drawer) return;

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      // Cerrar otros acordeones para mantener foco visual y no dispersar a usuarios de baja visión
      items.forEach((otherItem) => {
        if (otherItem !== item) {
          const otherTrigger = otherItem.querySelector('.service-trigger');
          const otherDrawer = otherItem.querySelector('.service-detail-drawer');
          if (otherTrigger && otherDrawer) {
            otherTrigger.setAttribute('aria-expanded', 'false');
            otherItem.classList.remove('is-active');
            otherDrawer.hidden = true;
          }
        }
      });

      if (isExpanded) {
        trigger.setAttribute('aria-expanded', 'false');
        item.classList.remove('is-active');
        drawer.hidden = true;
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        item.classList.add('is-active');
        drawer.hidden = false;

        gsap.fromTo(
          drawer,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
        );
      }

      ScrollTrigger.refresh();
    });
  });
}

// Alias para preservar compatibilidad con imports existentes
export const initServicesHoverAnimation = initServicesAccordion;
let horizontalSuitesTL = null;

export function refreshHorizontalSuitesScroll() {
  const section = document.getElementById('suitesHorizontalPinWrapper');
  const pinnedEl = document.getElementById('suitesHorizontalPinned');
  const track = document.getElementById('suitesHorizontalTrack');

  // 1. Limpiar timeline y ScrollTriggers previos vinculados a suites
  if (horizontalSuitesTL) {
    if (horizontalSuitesTL.scrollTrigger) {
      horizontalSuitesTL.scrollTrigger.kill(true);
    }
    horizontalSuitesTL.kill();
    horizontalSuitesTL = null;
  }

  ScrollTrigger.getAll().forEach(st => {
    if (st.trigger === section || st.pin === pinnedEl) {
      st.kill(true);
    }
  });

  if (!section || !pinnedEl || !track) {
    ScrollTrigger.refresh();
    return;
  }

  const cards = track.querySelectorAll('.suite-card-horizontal');
  const imgs = track.querySelectorAll('.suite-card-img');

  // 2. Verificar si la sección cinemática está oculta (Modo Grid activo)
  const isHidden = section.classList.contains('view-mode-hidden') ||
                   section.style.display === 'none' ||
                   (section.offsetParent === null && window.getComputedStyle(section).position !== 'fixed');

  if (isHidden) {
    // Si la sección cinemática está oculta, eliminamos cualquier residual y salimos
    gsap.set([track, cards, imgs, pinnedEl], { clearProps: 'all' });
    pinnedEl.style.height = 'auto';
    pinnedEl.style.minHeight = '0';
    pinnedEl.style.overflow = 'visible';
    track.style.transform = 'none';
    ScrollTrigger.refresh();
    return;
  }

  // El carrusel de suites ahora es compacto y autónomo con scroll-snap y controles laterales
  // ¡CERO scrolljacking forzado! La página fluye verticalmente de manera natural.
  pinnedEl.style.height = 'auto';
  pinnedEl.style.minHeight = 'auto';
  pinnedEl.style.display = 'block';
  pinnedEl.style.padding = '1.5rem 0';
  pinnedEl.style.overflow = 'visible';

  track.style.display = 'flex';
  track.style.flexWrap = 'nowrap';
  track.style.overflowX = 'auto';
  track.style.scrollSnapType = 'x mandatory';
  track.style.scrollBehavior = 'smooth';
  track.style.gap = '1.5rem';
  track.style.width = '100%';
  track.style.padding = '0.5rem 1rem';
  track.style.transform = 'none';

  ScrollTrigger.refresh();
}

export function initHorizontalSuitesScroll() {
  window.addEventListener('resize', () => {
    refreshHorizontalSuitesScroll();
  });
  refreshHorizontalSuitesScroll();
  return { refresh: refreshHorizontalSuitesScroll };
}
export function initMagneticButton(targetSelector = '#btnHeaderReserve') {
  const elements = typeof targetSelector === 'string' ? document.querySelectorAll(targetSelector) : [targetSelector];
  elements.forEach((btn) => {
    if (!btn) return;
    let textSpan = btn.querySelector('.btn-magnetic-text');
    if (!textSpan) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span class="btn-magnetic-text" style="display: inline-block; pointer-events: none; will-change: transform;">${originalHTML}</span>`;
      textSpan = btn.querySelector('.btn-magnetic-text');
    } else {
      textSpan.style.display = 'inline-block';
      textSpan.style.pointerEvents = 'none';
      textSpan.style.willChange = 'transform';
    }
    btn.style.display = 'inline-block';
    btn.style.willChange = 'transform';
    const magnetStrength = 0.45;
    const textStrength = 0.2;
    const activationRadius = 65;
    const handleMouseMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      const deltaX = e.clientX - btnCenterX;
      const deltaY = e.clientY - btnCenterY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < activationRadius + rect.width / 2) {
        gsap.to(btn, {
          x: deltaX * magnetStrength,
          y: deltaY * magnetStrength,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
        gsap.to(textSpan, {
          x: deltaX * textStrength,
          y: deltaY * textStrength,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      } else {
        resetPosition();
      }
    };
    const resetPosition = () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 1.2,
        ease: 'elastic.out(1, 0.3)',
        overwrite: 'auto',
      });
      gsap.to(textSpan, {
        x: 0,
        y: 0,
        duration: 1.2,
        ease: 'elastic.out(1, 0.3)',
        overwrite: 'auto',
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    btn.addEventListener('mouseleave', resetPosition);
  });
}
