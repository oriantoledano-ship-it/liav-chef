(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var A11Y_KEY = 'liav-a11y';
  var a11y = {};
  try { a11y = JSON.parse(localStorage.getItem(A11Y_KEY) || '{}') || {}; } catch (e) {}
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || a11y.motion === 'off';
  var lenis = null, swiper = null;

  /* smooth scroll */
  function initLenis() {
    if (reduce || typeof Lenis === 'undefined') return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    (function raf(t) { if (lenis) { lenis.raf(t); requestAnimationFrame(raf); } })(performance.now());
  }
  function lock(on) {
    if (lenis) { on ? lenis.stop() : lenis.start(); }
    root.style.overflow = on ? 'hidden' : '';
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el === document.body ? 0 : el, { offset: 0, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* loader */
  function initLoader(done) {
    var ld = $('#ld');
    if (!ld) return done();
    var seen = false;
    try { seen = sessionStorage.getItem('liav-ld') === '1'; } catch (e) {}
    if (location.hash.length > 1) seen = true;
    if (reduce || document.hidden || seen) {
      ld.classList.add('is-done');
      setTimeout(function () { ld.remove(); }, 700);
      return done();
    }
    try { sessionStorage.setItem('liav-ld', '1'); } catch (e) {}
    lock(true);
    var frames = $$('.ld__f', ld);
    var started = false, finished = false;
    function finish() {
      if (finished) return; finished = true;
      ld.classList.add('is-done');
      lock(false);
      done();
      setTimeout(function () { ld.remove(); }, 800);
    }
    function start() {
      if (started) return; started = true;
      ld.classList.add('is-go');
      var step = 400, first = 120;
      frames.forEach(function (f, i) { setTimeout(function () { f.classList.add('is-on'); }, first + i * step); });
      var tIn = first + (frames.length - 1) * step + 800;
      setTimeout(function () { ld.classList.add('is-out'); frames[frames.length - 1].classList.add('is-full'); }, tIn);
      setTimeout(finish, tIn + 1300);
    }
    var decodes = frames.map(function (f) {
      var img = $('img', f);
      return img && img.decode ? img.decode().catch(function () {}) : null;
    });
    Promise.race([Promise.all(decodes), new Promise(function (r) { setTimeout(r, 1500); })]).then(start);
    setTimeout(function () { start(); setTimeout(finish, 300); }, 8000);
  }

  /* where the page opens: a refresh always starts at the top, a link to a section lands there once,
     and the back button returns to the last position */
  var navType = (function () {
    var n = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (n) return n.type;
    return performance.navigation && performance.navigation.type === 1 ? 'reload' : 'navigate';
  })();
  var posKey = 'liav-y:' + location.pathname, touched = false;
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { addEventListener(ev, function () { touched = true; }, { passive: true, once: true }); });
  addEventListener('pagehide', function () { try { sessionStorage.setItem(posKey, String(Math.round(scrollY))); } catch (e) {} });
  function jumpTo(y) {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }
  function revealHero() {
    var h = $('.hero');
    if (h) setTimeout(function () { h.classList.add('is-live'); }, 60);
    var t = navType !== 'reload' && location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (location.hash) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (t) { setTimeout(function () { lenis ? lenis.scrollTo(t, { immediate: true, force: true }) : t.scrollIntoView(); }, 80); return; }
    var y = 0;
    if (navType === 'back_forward') { try { y = parseInt(sessionStorage.getItem(posKey), 10) || 0; } catch (e) {} }
    jumpTo(y);
    if (document.readyState !== 'complete') addEventListener('load', function () { if (!touched) jumpTo(y); }, { once: true });
  }

  /* nav + drawer */
  function initNav() {
    var nav = $('#nav'), burger = $('.burger'), drawer = $('#drawer');
    if (!nav) return;
    var hero = $('.hero'), lastY = 0;
    if (!hero) nav.classList.add('is-stuck');
    function onScroll() {
      var y = window.scrollY;
      if (hero) nav.classList.toggle('is-stuck', y > 40);
      if (!nav.classList.contains('is-open')) {
        if (y > window.innerHeight * 0.9 && y > lastY + 6) nav.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 200) nav.classList.remove('is-hidden');
      }
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (!burger || !drawer) return;
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
      drawer.setAttribute('aria-hidden', !open);
      lock(open);
    }
    burger.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); burger.focus(); } });
  }

  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = id === '#top' ? document.body : document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      setTimeout(function () { scrollToEl(el); }, $('#drawer.is-open') ? 350 : 0);
    });
  }

  /* reveals */
  var io = null;
  function initReveal() {
    var els = $$('.rv, .pic--rv, [data-split], .gi');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    io = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains('gi')) { el.style.transitionDelay = (batch++ % 4) * 90 + 'ms'; }
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* parallax (uses the independent `translate` property so it composes with reveal transforms) */
  function initParallax() {
    if (reduce) return;
    var pars = $$('.pic--par').map(function (p) { return { el: p, img: $('img', p) }; });
    var heroImg = $('.hero__media img');
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight, y = window.scrollY;
      if (heroImg && y < vh * 1.2) heroImg.style.translate = '0 ' + (y * 0.22).toFixed(1) + 'px';
      pars.forEach(function (p) {
        var r = p.el.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) return;
        var prog = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        p.img.style.translate = '0 ' + (prog * 6).toFixed(2) + '%';
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* gallery: filters + lightbox */
  function initGallery() {
    var grid = $('#grid');
    if (!grid) return;
    var items = $$('.gi', grid);
    function layout() {
      if (getComputedStyle(grid).display !== 'grid') return;
      var gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      items.forEach(function (it) {
        if (it.hidden) return;
        var h = $('img', it).getBoundingClientRect().height;
        it.style.gridRowEnd = 'span ' + Math.ceil((h + gap) / 4);
      });
      if (lenis) lenis.resize();
    }
    layout();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
    $$('.filters button').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.filter;
        $$('.filters button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        var n = 0;
        items.forEach(function (it) {
          var show = f === 'all' || it.dataset.cat === f;
          it.hidden = !show;
          if (show && !reduce) {
            it.classList.remove('is-in');
            it.style.transitionDelay = Math.min(n++, 8) * 60 + 'ms';
            setTimeout(function () { it.classList.add('is-in'); }, 30);
          }
        });
        layout();
      });
    });

    var lb = $('#lb');
    if (!lb) return;
    var img = $('.lb__img', lb), cap = $('[data-lb-cap]', lb), num = $('[data-lb-n]', lb);
    var list = [], idx = 0, lastFocus = null;
    function show(i) {
      idx = (i + list.length) % list.length;
      var it = list[idx], im = $('img', it);
      img.classList.add('is-swap');
      var pre = new Image();
      pre.onload = pre.onerror = function () {
        img.src = it.dataset.full; img.alt = im.alt;
        img.classList.remove('is-swap');
      };
      pre.src = it.dataset.full;
      cap.textContent = ($('figcaption', it) || {}).textContent || '';
      num.textContent = (idx + 1) + ' / ' + list.length;
    }
    function open(it) {
      list = items.filter(function (x) { return !x.hidden; });
      lastFocus = it;
      show(list.indexOf(it));
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      lock(true);
      $('.lb__close', lb).focus();
    }
    function close() {
      lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
      lock(false);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    items.forEach(function (it) { it.addEventListener('click', function () { open(it); }); });
    $('.lb__close', lb).addEventListener('click', close);
    $('.lb__next', lb).addEventListener('click', function () { show(idx + 1); });
    $('.lb__prev', lb).addEventListener('click', function () { show(idx - 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx + 1);
      else if (e.key === 'ArrowRight') show(idx - 1);
      else if (e.key === 'Tab') {
        var f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* atmosphere carousel */
  function initCarousel() {
    var el = $('.car__swiper');
    if (!el || typeof Swiper === 'undefined') return;
    var total = $$('.swiper-slide', el).length;
    var cur = $('[data-cur]'), tot = $('[data-tot]'), bar = $('.car__prog i');
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    if (tot) tot.textContent = pad(total);
    function sync(s) {
      var i = s.realIndex + 1;
      if (cur) cur.textContent = pad(i);
      if (bar) bar.style.transform = 'scaleX(' + (i / total) + ')';
    }
    swiper = new Swiper(el, {
      slidesPerView: 'auto', centeredSlides: true, loop: true, speed: 1100, grabCursor: true,
      spaceBetween: 14, breakpoints: { 761: { spaceBetween: 26 } },
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: { prevSlideMessage: 'התמונה הקודמת', nextSlideMessage: 'התמונה הבאה' },
      navigation: { nextEl: '.car__next', prevEl: '.car__prev' },
      autoplay: reduce ? false : { delay: 3600, disableOnInteraction: false, pauseOnMouseEnter: true },
      on: { init: sync, slideChange: sync }
    });
    if (swiper.autoplay && 'IntersectionObserver' in window) {
      swiper.autoplay.stop();
      new IntersectionObserver(function (en) {
        if (reduce || !swiper.autoplay) return;
        en[0].isIntersecting ? swiper.autoplay.start() : swiper.autoplay.stop();
      }, { threshold: 0.25 }).observe(el);
    }
  }

  /* label cursor (fine pointers only) */
  function initCursor() {
    var c = $('.cur');
    if (!c || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    var x = 0, y = 0, cx = 0, cy = 0, run = false;
    function loop() {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      c.style.left = cx + 'px'; c.style.top = cy + 'px';
      if (Math.abs(x - cx) > 0.3 || Math.abs(y - cy) > 0.3) requestAnimationFrame(loop); else run = false;
    }
    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!run) { run = true; requestAnimationFrame(loop); }
      var t = e.target.closest && e.target.closest('.gi, [data-cursor]');
      if (t) { c.textContent = t.classList.contains('gi') ? 'הגדלה' : t.dataset.cursor; c.classList.add('is-on'); }
      else c.classList.remove('is-on');
    }, { passive: true });
    document.addEventListener('mouseleave', function () { c.classList.remove('is-on'); });
  }

  function initMcta() {
    var hero = $('.hero'), contact = $('#contact');
    if (!$('.mcta') || !hero) return;
    function on() {
      var past = window.scrollY > hero.offsetHeight * 0.7;
      var atContact = contact && contact.getBoundingClientRect().top < window.innerHeight * 0.6;
      document.body.classList.toggle('mcta-on', past && !atContact);
    }
    window.addEventListener('scroll', on, { passive: true }); on();
  }

  /* accessibility widget */
  function initA11y() {
    var btn = $('.a11y-btn'), panel = $('.a11y-panel');
    function apply(s) {
      s.contrast === 'high' ? root.setAttribute('data-contrast', 'high') : root.removeAttribute('data-contrast');
      s.motion === 'off' ? root.setAttribute('data-motion', 'off') : root.removeAttribute('data-motion');
      s.links === 'highlight' ? root.setAttribute('data-links', 'highlight') : root.removeAttribute('data-links');
      (s.fontsize === 'l' || s.fontsize === 'xl') ? root.setAttribute('data-fontsize', s.fontsize) : root.removeAttribute('data-fontsize');
      $$('.a11y-chip').forEach(function (chip) {
        var k = chip.dataset.key, v = chip.dataset.val;
        var cur = k === 'fontsize' ? (s.fontsize || 'm') : (s[k] || (k === 'motion' ? 'on' : 'off'));
        chip.classList.toggle('is-active', cur === v);
        chip.setAttribute('aria-pressed', cur === v);
      });
    }
    apply(a11y);
    if (btn && panel) {
      function setOpen(o) { panel.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o); panel.setAttribute('aria-hidden', !o); }
      btn.addEventListener('click', function () { setOpen(!panel.classList.contains('is-open')); });
      document.addEventListener('click', function (e) { if (!panel.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) { setOpen(false); btn.focus(); } });
    }
    function motionOff(off) {
      if (!off) return;
      $$('.rv, .pic--rv, [data-split], .gi').forEach(function (el) { el.classList.add('is-in'); });
      if (swiper && swiper.autoplay) swiper.autoplay.stop();
      if (lenis) { lenis.destroy(); lenis = null; }
      reduce = true;
    }
    $$('.a11y-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        a11y[chip.dataset.key] = chip.dataset.val;
        try { localStorage.setItem(A11Y_KEY, JSON.stringify(a11y)); } catch (e) {}
        apply(a11y);
        if (chip.dataset.key === 'motion') motionOff(chip.dataset.val === 'off');
      });
    });
    var reset = $('.a11y-reset');
    if (reset) reset.addEventListener('click', function () {
      a11y = {};
      try { localStorage.setItem(A11Y_KEY, '{}'); } catch (e) {}
      apply(a11y);
    });
  }

  function boot() {
    $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });
    initLenis();
    initNav();
    initAnchors();
    initReveal();
    initParallax();
    initGallery();
    initCarousel();
    initCursor();
    initMcta();
    initA11y();
    root.setAttribute('data-ready', '');
    initLoader(revealHero);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
