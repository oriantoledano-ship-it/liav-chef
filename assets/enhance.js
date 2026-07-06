/* ==========================================================================
   ENHANCE — mouse-reactive depth, 3D tilt, staggered/masked reveals.
   Layered on top of app.js; never fights it. Degrades to static when
   GSAP / fine-pointer / motion are unavailable.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var a11y = {};
  try { a11y = JSON.parse(localStorage.getItem('liav-a11y')) || {}; } catch (e) {}
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || a11y.motion === 'off';
  var fine = matchMedia('(pointer: fine)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  /* ---------------------------------------------------------------
     1. Inject aurora layers into the dark hero + cta
     --------------------------------------------------------------- */
  function aurora(host) {
    if (!host || host.querySelector('.aurora')) return null;
    var a = document.createElement('div');
    a.className = 'aurora';
    a.setAttribute('aria-hidden', 'true');
    a.innerHTML = '<span class="aurora__b aurora__b--1"></span><span class="aurora__b aurora__b--2"></span><span class="aurora__b aurora__b--3"></span>';
    host.insertBefore(a, host.firstChild);
    return a;
  }
  var heroBg = document.querySelector('.hero__bg');
  var ctaBg = document.querySelector('.cta__bg');
  var auroras = [];
  if (heroBg) { var ah = aurora(heroBg.parentElement); if (ah) auroras.push(ah); }
  if (ctaBg) { var ac = aurora(ctaBg.parentElement); if (ac) auroras.push(ac); }

  /* ---------------------------------------------------------------
     2. Global mouse tracking → aurora parallax + hero tilt
     --------------------------------------------------------------- */
  var mx = 0.5, my = 0.5;           // normalized 0..1
  var cmx = 0.5, cmy = 0.5;         // smoothed
  var heroVisual = document.querySelector('.hero__visual');
  var heroFrame = document.querySelector('.hero__frame');

  if (fine && !reduce) {
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    }, { passive: true });

    var raf = function () {
      cmx += (mx - cmx) * 0.06;
      cmy += (my - cmy) * 0.06;
      var dx = (cmx - 0.5), dy = (cmy - 0.5);

      // aurora blobs drift toward the cursor at different depths
      auroras.forEach(function (a) {
        var blobs = a.children;
        for (var i = 0; i < blobs.length; i++) {
          var depth = (i + 1) * 14;
          blobs[i].style.translate = (dx * depth).toFixed(1) + 'px ' + (dy * depth).toFixed(1) + 'px';
        }
      });

      // hero image: 3D tilt + counter-parallax
      if (heroFrame) {
        heroFrame.style.transform =
          'perspective(1000px) rotateY(' + (dx * 7).toFixed(2) + 'deg) rotateX(' + (-dy * 7).toFixed(2) + 'deg) translateZ(0)';
      }
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  /* ---------------------------------------------------------------
     3. Card 3D tilt (services rows already lift; add reviews + gallery)
     --------------------------------------------------------------- */
  function tilt(el, max) {
    max = max || 6;
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = 'perspective(900px) rotateY(' + (px * max).toFixed(2) + 'deg) rotateX(' + (-py * max).toFixed(2) + 'deg) translateY(-6px)';
    });
    el.addEventListener('mouseleave', function () { el.style.transform = ''; });
  }
  if (fine && !reduce) {
    document.querySelectorAll('.review').forEach(function (el) { tilt(el, 5); });
  }

  /* ---------------------------------------------------------------
     4. Section headings + card groups.
     Word-split reveals here fought the fx3d section's pinned
     ScrollTrigger (positions shifted underneath them) and left headings
     stranded off-screen ("looked deleted"). app.js already reveals every
     .will-rise via a rock-solid ScrollTrigger.batch — we leave that in
     charge and don't touch these elements, so nothing double-animates.
     --------------------------------------------------------------- */

  /* ---------------------------------------------------------------
     6. Scroll progress bar (thin gradient line, top of viewport)
     --------------------------------------------------------------- */
  if (!reduce) {
    var bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;top:0;right:0;left:0;height:2px;z-index:1400;transform-origin:right;transform:scaleX(0);background:linear-gradient(90deg,var(--ember),var(--gold));pointer-events:none';
    document.body.appendChild(bar);
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------
     7. Mobile sticky CTA — slide up once the hero is scrolled past.
        CSS hides it on desktop; the class toggle is a no-op there.
     --------------------------------------------------------------- */
  var mcta = document.querySelector('[data-mobile-cta]');
  var heroSec = document.querySelector('.hero');
  if (mcta && heroSec) {
    var mctaScroll = function () {
      var past = window.scrollY > heroSec.offsetHeight * 0.72;
      mcta.classList.toggle('is-shown', past);
      document.body.classList.toggle('mcta-on', past);
    };
    window.addEventListener('scroll', mctaScroll, { passive: true });
    mctaScroll();
  }
})();
