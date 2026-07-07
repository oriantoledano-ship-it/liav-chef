/* ==========================================================================
   MAKEOVER — SplitText kinetic headings · Swiper 3D gallery ·
   DrawSVG chef signature. Runs after app.js + enhance.js.
   ========================================================================== */
(function () {
  'use strict';

  var a11y = {};
  try { a11y = JSON.parse(localStorage.getItem('liav-a11y')) || {}; } catch (e) {}
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || a11y.motion === 'off';
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  if (hasGSAP) {
    if (window.SplitText) gsap.registerPlugin(SplitText);
    if (window.DrawSVGPlugin) gsap.registerPlugin(DrawSVGPlugin);
  }

  /* -----------------------------------------------------------------
     1. SplitText kinetic reveal on section headings.
        Takes them away from app.js's .will-rise batch so nothing
        double-animates. Char reveal via ScrollTrigger.batch (resilient
        to the fx3d pin) + a safety pass that un-hides anything stuck.
     ----------------------------------------------------------------- */
  var allChars = [];
  if (hasGSAP && window.SplitText && !reduce) {
    document.querySelectorAll('.sec-head .h2').forEach(function (h2) {
      var split = new SplitText(h2, { type: 'chars', charsClass: 'mk-char' });
      h2.classList.remove('will-rise');
      h2.classList.add('mk-taken');
      gsap.set(split.chars, { yPercent: 55, opacity: 0 });
      allChars = allChars.concat(split.chars);
      ScrollTrigger.batch(split.chars, {
        start: 'top 90%',
        onEnter: function (batch) {
          gsap.to(batch, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.012, overwrite: true });
        }
      });
    });
    ScrollTrigger.refresh();
    // safety: if any char is still hidden while its heading is in/above view, reveal it
    setTimeout(function () {
      allChars.forEach(function (c) {
        if (parseFloat(getComputedStyle(c).opacity) < 0.5) {
          var h2 = c.closest('.h2');
          if (h2 && h2.getBoundingClientRect().top < window.innerHeight) {
            gsap.to(c, { yPercent: 0, opacity: 1, duration: 0.5, overwrite: true });
          }
        }
      });
    }, 2600);
  } else if (window.SplitText) {
    // reduced-motion: leave headings fully visible, no split animation
    document.querySelectorAll('.sec-head .h2').forEach(function (h2) { h2.classList.add('mk-taken'); });
  }

  /* -----------------------------------------------------------------
     2. Swiper 3D coverflow gallery
     ----------------------------------------------------------------- */
  var gEl = document.querySelector('[data-gallery-swiper]');
  if (gEl && window.Swiper) {
    var curEl = document.querySelector('[data-swiper-current]');
    var totEl = document.querySelector('[data-swiper-total]');
    var swiper = new Swiper(gEl, {
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      rewind: true,
      speed: 650,
      coverflowEffect: { rotate: 0, stretch: 34, depth: 200, modifier: 1.5, slideShadows: false },
      keyboard: { enabled: true },
      navigation: { prevEl: '.gnav--prev', nextEl: '.gnav--next' },
      on: {
        init: function () { if (totEl) totEl.textContent = this.slides.length; },
        slideChange: function () { if (curEl) curEl.textContent = (this.activeIndex + 1); }
      }
    });
    if (totEl) totEl.textContent = '7';
    // pause hint: refresh ScrollTrigger once the gallery lays out
    if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 400);
  }

  /* -----------------------------------------------------------------
     3. DrawSVG chef signature + hairline rules
     ----------------------------------------------------------------- */
  if (hasGSAP && window.DrawSVGPlugin) {
    var sig = document.querySelector('.about__flourish path');
    if (sig) {
      if (reduce) {
        gsap.set(sig, { drawSVG: '100%' });
      } else {
        gsap.set(sig, { drawSVG: '0%' });
        gsap.to(sig, {
          drawSVG: '100%', duration: 1.7, ease: 'power2.inOut',
          scrollTrigger: { trigger: '.about__sign', start: 'top 82%' }
        });
      }
    }
  } else {
    var sig2 = document.querySelector('.about__flourish path');
    if (sig2) sig2.style.strokeDashoffset = '0';
  }
})();
