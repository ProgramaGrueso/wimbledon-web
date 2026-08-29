import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';
gsap.registerPlugin(ScrollTrigger);
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
  };
}
export function initHeroPinAnimation() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    const pinWrapper = document.getElementById('heroPinWrapper');
    const heroCardMedia = document.getElementById('heroCardMedia');
    const heroContent = document.getElementById('heroEditorialContent');
    if (!pinWrapper || !heroCardMedia || !heroContent) return;
    gsap.set(heroCardMedia, {
      clipPath: 'inset(12% 16% 12% 16% round 24px)',
      scale: 0.95,
    });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinWrapper,
        start: 'top top',
        end: '+=100%',
        scrub: 1.2,
        pin: '#hero',
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    tl.to(
      heroCardMedia,
      {
        clipPath: 'inset(0% 0% 0% 0% round 0px)',
        scale: 1.0,
        ease: 'power2.inOut',
        duration: 1,
      },
      0
    );
    tl.to(
      heroContent,
      {
        yPercent: -50,
        opacity: 0,
        ease: 'power1.in',
        duration: 0.8,
      },
      0
    );
    return () => {
      gsap.set([heroCardMedia, heroContent], { clearProps: 'all' });
    };
  });
  mm.add('(max-width: 767px)', () => {
    const heroCardMedia = document.getElementById('heroCardMedia');
    const heroContent = document.getElementById('heroEditorialContent');
    if (heroCardMedia) {
      gsap.set(heroCardMedia, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)',
        scale: 1,
      });
    }
    if (heroContent) {
      gsap.set(heroContent, {
        yPercent: 0,
        opacity: 1,
      });
    }
  });
  return mm;
}
export function initServicesHoverAnimation() {
  const preview = document.getElementById('servicesHoverPreview');
  const img = document.getElementById('servicesHoverImg');
  const items = document.querySelectorAll('.service-item');
  if (!preview || !img || items.length === 0) return;
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.4, ease: 'power3.out' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.4, ease: 'power3.out' });
  window.addEventListener('mousemove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  items.forEach((item) => {
    const title = item.querySelector('.service-title');
    const imgSrc = item.getAttribute('data-img');
    item.addEventListener('mouseenter', () => {
      if (imgSrc) img.src = imgSrc;
      if (title) {
        gsap.to(title, {
          x: 16,
          color: '#c5a880',
          duration: 0.35,
          ease: 'power2.out',
        });
      }
      gsap.to(preview, {
        opacity: 1,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
      });
    });
    item.addEventListener('mouseleave', () => {
      if (title) {
        gsap.to(title, {
          x: 0,
          color: '#ffffff',
          duration: 0.35,
          ease: 'power2.out',
        });
      }
      gsap.to(preview, {
        opacity: 0,
        scale: 0.8,
        duration: 0.35,
        ease: 'power2.out',
      });
    });
  });
}
export function initHorizontalSuitesScroll() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    const section = document.getElementById('suitesHorizontalPinWrapper');
    const track = document.getElementById('suitesHorizontalTrack');
    const cards = document.querySelectorAll('.suite-card-horizontal');
    const imgs = document.querySelectorAll('.suite-card-img');
    if (!section || !track || cards.length === 0) return;
    const getScrollAmount = () => {
      return -(track.scrollWidth - window.innerWidth + 120);
    };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${track.scrollWidth}`,
        pin: '#suitesHorizontalPinned',
        scrub: 1.2,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const skew = gsap.utils.clamp(-6, 6, self.getVelocity() / -250);
          gsap.to(cards, {
            skewX: skew,
            duration: 0.25,
            ease: 'power1.out',
            overwrite: 'auto',
          });
        },
      },
    });
    tl.to(track, {
      x: getScrollAmount,
      ease: 'none',
    });
    imgs.forEach((img) => {
      tl.fromTo(
        img,
        { xPercent: 15 },
        {
          xPercent: -15,
          ease: 'none',
        },
        0
      );
    });
    return () => {
      gsap.set([track, cards, imgs], { clearProps: 'all' });
    };
  });
  return mm;
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
