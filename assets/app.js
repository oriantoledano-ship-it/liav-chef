/* ==========================================================================
   ליאב שמעונוב · שף פרטי — motion & interaction layer
   GSAP + ScrollTrigger + Lenis. Every animation motivated.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  // ---- respect a11y motion preference (saved + system) ----
  var A11Y_KEY = 'liav-a11y';
  function loadA11y() { try { return JSON.parse(localStorage.getItem(A11Y_KEY)) || {}; } catch (e) { return {}; } }
  var a11yState = loadA11y();
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || a11yState.motion === 'off';

  var lenis = null;

  /* =====================================================================
     1. LOADER  →  then reveal hero
     ===================================================================== */
  function splitChars(el) {
    var text = el.textContent;
    el.textContent = '';
    var frag = document.createDocumentFragment();
    text.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch === ' ' ? ' ' : ch;
      frag.appendChild(s);
    });
    el.appendChild(frag);
    return el.querySelectorAll('.char');
  }

  function initLoader(done) {
    var loader = document.getElementById('loader');
    var finished = false;
    function finish() {
      if (finished) return; finished = true;
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();
      var l = document.getElementById('loader');
      if (l && l.parentNode) l.parentNode.removeChild(l);
      done();
    }
    // Skip the loader entirely when we can't animate it (no GSAP, reduced
    // motion, or the tab is backgrounded — rAF is frozen there, so the
    // loader would never finish and would trap the page).
    if (!loader || reduceMotion || !hasGSAP || document.hidden) {
      finish();
      return;
    }
    document.body.classList.add('is-loading');
    if (lenis) lenis.stop();

    var word = loader.querySelector('[data-loader-word]');
    var sub = loader.querySelector('[data-loader-sub]');
    var bar = loader.querySelector('[data-loader-bar]');
    var countEl = loader.querySelector('[data-count]');
    var chars = splitChars(word);
    var counter = { v: 0 };

    var tl = gsap.timeline({ onComplete: finish });
    tl.to(chars, { yPercent: -100, duration: 0.9, ease: 'expo.out', stagger: 0.035 }, 0.15)
      .to(sub, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.45')
      .to(counter, {
        v: 100, duration: 1.5, ease: 'power2.inOut',
        onUpdate: function () {
          var v = Math.round(counter.v);
          if (countEl) countEl.textContent = v;
          if (bar) bar.style.width = v + '%';
        }
      }, 0.2)
      .to(loader.querySelector('.loader__inner'), { y: -24, opacity: 0, duration: 0.55, ease: 'power2.in' }, '+=0.1')
      .to(countEl, { opacity: 0, duration: 0.4 }, '<')
      .to(loader, { yPercent: -100, duration: 0.95, ease: 'expo.inOut' }, '-=0.15');

    // safety net — force-finish if anything stalls (e.g. tab backgrounded mid-run,
    // a hosting environment that throttles rAF, or GSAP failing silently)
    setTimeout(function () { if (!finished) { try { tl.progress(1); } catch (e) {} finish(); } }, 3500);
    // extra guarantee — if the page's visibility flips to visible again mid-load, refresh timing
    document.addEventListener('visibilitychange', function () {
      if (!finished && !document.hidden) { try { tl.progress(1); } catch (e) {} finish(); }
    });
  }

  /* =====================================================================
     2. HERO reveal (kinetic lines)
     ===================================================================== */
  function revealHero() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    hero.classList.add('is-in');

    var fades = hero.querySelectorAll('.hero__fade');
    if (reduceMotion || !hasGSAP || document.hidden) {
      // GSAP-independent fallback so the hero is never left hidden
      fades.forEach(function (f) { f.style.opacity = 1; f.style.transform = 'none'; });
      hero.querySelectorAll('.row[data-split]').forEach(function (r) { r.style.opacity = 1; });
      return;
    }

    // wrap each hero title row's content in a rising inner span
    var rows = hero.querySelectorAll('.hero__title .row[data-split]');
    var inners = [];
    rows.forEach(function (row) {
      var inner = document.createElement('span');
      inner.style.display = 'block';
      inner.style.transform = 'translateY(110%)';
      inner.style.willChange = 'transform';
      while (row.firstChild) inner.appendChild(row.firstChild);
      row.appendChild(inner);
      row.style.overflow = 'hidden';
      row.style.display = 'block';
      row.style.paddingBottom = '0.12em';
      inners.push(inner);
    });

    // establish start state BEFORE the timeline builds so the fade actually reads
    gsap.set(fades, { opacity: 0, y: 18 });
    var tl = gsap.timeline();
    tl.to(inners, { yPercent: -100, duration: 1.05, ease: 'expo.out', stagger: 0.11 }, 0)
      .to(fades, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09 }, 0.25);
  }

  /* =====================================================================
     3. Lenis smooth scroll
     ===================================================================== */
  function initLenis() {
    if (reduceMotion || !window.Lenis) return;
    lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    window.lenis = lenis;
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  }

  /* =====================================================================
     4. Scroll animations
     ===================================================================== */
  function initScroll() {
    if (!hasGSAP) {
      // no GSAP: just reveal everything
      document.querySelectorAll('.will-rise, .will-fade').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
      return;
    }
    if (reduceMotion) {
      gsap.set('.will-rise, .will-fade', { opacity: 1, y: 0, clearProps: 'transform' });
      return;
    }

    // batched reveals with stagger for neighbours
    ScrollTrigger.batch('.will-rise', {
      start: 'top 88%',
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.09, overwrite: true }); }
    });
    ScrollTrigger.batch('.will-fade', {
      start: 'top 90%',
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, duration: 1.1, ease: 'power2.out', stagger: 0.08, overwrite: true }); }
    });

    // parallax on framed images
    gsap.utils.toArray('[data-parallax-img]').forEach(function (img) {
      var wrap = img.closest('figure') || img.parentElement;
      gsap.fromTo(img, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // process chapters — giant ghost numbers drift on scroll
    gsap.utils.toArray('[data-ch-idx]').forEach(function (idx) {
      gsap.fromTo(idx, { xPercent: 8 }, {
        xPercent: -8, ease: 'none',
        scrollTrigger: { trigger: idx.closest('.chapter'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // gallery cards rise in as the rail scrolls into view
    gsap.utils.toArray('.gcard').forEach(function (card, i) {
      gsap.fromTo(card, { y: 46, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: '#gallery', start: 'top 78%' }
      });
    });
  }

  /* =====================================================================
     4b. Gallery rail — wheel-to-horizontal + drag-to-scroll (desktop).
         Touch devices use native swipe; no JS needed there.
     ===================================================================== */
  function initGalleryRail() {
    var vp = document.querySelector('[data-gallery-viewport]');
    if (!vp) return;
    if (window.matchMedia('(pointer: fine)').matches) {
      // vertical wheel over the rail nudges it sideways, then hands back to page
      vp.addEventListener('wheel', function (e) {
        var dom = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        var atStart = vp.scrollLeft <= 0;
        var atEnd = vp.scrollLeft >= vp.scrollWidth - vp.clientWidth - 1;
        // RTL: scrollLeft is <= 0; the far end is a large negative number
        if ((dom < 0 && atStart) || (dom > 0 && atEnd)) return; // let the page scroll
        e.preventDefault();
        vp.scrollLeft += dom;
      }, { passive: false });

      // click-drag to pan
      var down = false, sx = 0, sl = 0, moved = false;
      vp.addEventListener('pointerdown', function (e) {
        down = true; moved = false; sx = e.clientX; sl = vp.scrollLeft; vp.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - sx;
        if (Math.abs(dx) > 4) moved = true;
        vp.scrollLeft = sl - dx;
      });
      window.addEventListener('pointerup', function () { down = false; vp.classList.remove('is-dragging'); });
      // swallow the click that ends a drag so cards don't open Instagram mid-pan
      vp.addEventListener('click', function (e) { if (moved) { e.preventDefault(); } }, true);
    }
  }

  /* =====================================================================
     5. Marquee — duplicate items once; the loop itself runs on a plain
        CSS @keyframes animation (assets/styles.css) so it never depends
        on GSAP/JS load timing to start or to keep looping.
     ===================================================================== */
  function initMarquee() {
    var mq = document.querySelector('[data-marquee]');
    if (!mq) return;
    if (reduceMotion) mq.style.animation = 'none';
    // Build AFTER fonts load — measuring before the display font swaps in gives
    // a too-small single-set width, so the -dist is short and the loop "jumps
    // and vanishes". Duplicate the set, then scroll by exactly one set + one gap
    // for a pixel-seamless loop.
    var built = false;
    var build = function () {
      if (built) return; built = true;
      var n = mq.children.length;                       // original item count
      mq.innerHTML = mq.innerHTML + mq.innerHTML;        // duplicate the set
      // getBoundingClientRect forces a synchronous reflow and returns sub-pixel
      // values, so the loop distance is exact — offsetLeft rounded to integers
      // and drifted ~2px, leaving a sliver gap each cycle (the "vanishing").
      var kids = mq.children;
      var a = kids[0].getBoundingClientRect().left;
      var b = kids[n].getBoundingClientRect().left;
      mq.style.setProperty('--marq-dist', Math.abs(b - a).toFixed(2) + 'px');
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build);
      setTimeout(build, 1200); // safety if fonts.ready never resolves
    } else {
      build();
    }
  }

  /* =====================================================================
     6. Custom cursor
     ===================================================================== */
  function initCursor() {
    if (reduceMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    var dot = document.querySelector('.cursor:not(.cursor--ring)');
    var ring = document.querySelector('.cursor--ring');
    if (!dot || !ring) return;
    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    function ringLoop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(ringLoop);
    }
    requestAnimationFrame(ringLoop);
    var hot = 'a, button, [data-cursor="hot"], summary, .a11y-chip';
    document.querySelectorAll(hot).forEach(function (el) {
      el.addEventListener('mouseenter', function () { document.body.classList.add('cursor-hot'); });
      el.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-hot'); });
    });
  }

  /* =====================================================================
     7. Magnetic buttons
     ===================================================================== */
  function initMagnetic() {
    if (reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.22).toFixed(1) + 'px,' + (y * 0.32).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* =====================================================================
     8. Nav + drawer
     ===================================================================== */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (nav) {
      var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 40); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    var burger = document.querySelector('.nav__burger');
    var drawer = document.querySelector('.drawer');
    if (burger && drawer) {
      burger.addEventListener('click', function () {
        var open = document.body.classList.toggle('menu-open');
        burger.setAttribute('aria-expanded', open);
        drawer.setAttribute('aria-hidden', !open);
        if (lenis) { open ? lenis.stop() : lenis.start(); }
      });
      drawer.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          document.body.classList.remove('menu-open');
          burger.setAttribute('aria-expanded', 'false');
          drawer.setAttribute('aria-hidden', 'true');
          if (lenis) lenis.start();
        });
      });
    }
  }

  /* =====================================================================
     9. Smooth anchor scrolling
     ===================================================================== */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.2 });
        else {
          var y = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
    });
  }

  /* =====================================================================
     10. FAQ single-open
     ===================================================================== */
  function initFaq() {
    var items = document.querySelectorAll('[data-faq]');
    items.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (item.open) items.forEach(function (o) { if (o !== item) o.open = false; });
        if (lenis && hasGSAP) ScrollTrigger.refresh();
      });
    });
  }

  /* =====================================================================
     11. Accessibility widget
     ===================================================================== */
  function initA11y() {
    var btn = document.querySelector('.a11y-btn');
    var panel = document.querySelector('.a11y-panel');

    function apply(s) {
      s.contrast === 'high' ? root.setAttribute('data-contrast', 'high') : root.removeAttribute('data-contrast');
      s.motion === 'off' ? root.setAttribute('data-motion', 'off') : root.removeAttribute('data-motion');
      s.links === 'highlight' ? root.setAttribute('data-links', 'highlight') : root.removeAttribute('data-links');
      (s.fontsize === 'l' || s.fontsize === 'xl') ? root.setAttribute('data-fontsize', s.fontsize) : root.removeAttribute('data-fontsize');
      document.querySelectorAll('.a11y-chip').forEach(function (chip) {
        var k = chip.dataset.key, v = chip.dataset.val;
        var cur = (k === 'fontsize') ? (s.fontsize || 'm') : (s[k] || (k === 'motion' ? 'on' : 'off'));
        chip.classList.toggle('is-active', cur === v);
        chip.setAttribute('aria-pressed', cur === v);
      });
    }
    apply(a11yState);

    if (btn && panel) {
      btn.addEventListener('click', function () {
        var open = panel.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open);
        panel.setAttribute('aria-hidden', !open);
      });
      document.addEventListener('click', function (e) {
        if (!panel.contains(e.target) && !btn.contains(e.target)) {
          panel.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); panel.setAttribute('aria-hidden', 'true');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panel.classList.contains('is-open')) { panel.classList.remove('is-open'); btn.focus(); }
      });
    }
    document.querySelectorAll('.a11y-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        a11yState[chip.dataset.key] = chip.dataset.val;
        try { localStorage.setItem(A11Y_KEY, JSON.stringify(a11yState)); } catch (e) {}
        apply(a11yState);
        if (chip.dataset.key === 'motion') {
          var mq = document.querySelector('[data-marquee]');
          if (mq) mq.style.animation = (chip.dataset.val === 'off') ? 'none' : '';
        }
      });
    });
    var reset = document.querySelector('.a11y-reset');
    if (reset) reset.addEventListener('click', function () {
      a11yState = {};
      try { localStorage.setItem(A11Y_KEY, '{}'); } catch (e) {}
      apply(a11yState);
      var mq = document.querySelector('[data-marquee]');
      if (mq) mq.style.animation = '';
    });
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  function boot() {
    var y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();
    initLenis();
    initMarquee();
    initScroll();
    initGalleryRail();
    initCursor();
    initMagnetic();
    initNav();
    initAnchors();
    initFaq();
    initA11y();
    initLoader(revealHero);
    if (hasGSAP) { window.addEventListener('load', function () { ScrollTrigger.refresh(); }); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
