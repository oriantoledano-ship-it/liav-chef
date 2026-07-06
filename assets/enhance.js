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
     4. Masked word-reveal on every section H2 (scroll-triggered)
     --------------------------------------------------------------- */
  function splitH2(h2) {
    if (h2.dataset.split) return;
    h2.dataset.split = '1';
    var nodes = Array.prototype.slice.call(h2.childNodes);
    h2.innerHTML = '';
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {                       // text → words
        node.textContent.split(/(\s+)/).forEach(function (tok) {
          if (tok.trim() === '') { h2.appendChild(document.createTextNode(tok)); return; }
          var w = document.createElement('span'); w.className = 'wrev';
          var inner = document.createElement('i'); inner.textContent = tok;
          w.appendChild(inner); h2.appendChild(w);
        });
      } else if (node.nodeName === 'BR') {
        h2.appendChild(document.createElement('br'));
      } else {                                          // keep spans/accents, wrap as one unit
        var w2 = document.createElement('span'); w2.className = 'wrev';
        var inner2 = document.createElement('i'); inner2.appendChild(node);
        w2.appendChild(inner2); h2.appendChild(w2);
      }
    });
    // hand full control of this heading to the word-reveal; stop app.js's
    // batch from double-animating it as a plain .will-rise block.
    h2.classList.remove('will-rise');
    if (window.gsap) gsap.set(h2, { opacity: 1, clearProps: 'transform' });
    return h2.querySelectorAll('.wrev > i');
  }

  if (hasGSAP && !reduce) {
    document.querySelectorAll('.sec-head .h2, .fx3d__head .h2, .cta .h2, .about__body .h2').forEach(function (h2) {
      var inners = splitH2(h2);
      if (!inners || !inners.length) return;
      gsap.set(inners, { yPercent: 108 });
      gsap.to(inners, {
        yPercent: 0, duration: 1.0, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: h2, start: 'top 88%' }
      });
    });

    /* ---------------------------------------------------------------
       5. Stronger staggered entrances for card groups
       --------------------------------------------------------------- */
    var groups = [
      { sel: '.svc-list .svc', from: { y: 40, opacity: 0, filter: 'blur(6px)' } },
      { sel: '.reviews__grid .review', from: { y: 50, opacity: 0, scale: 0.96 } },
      { sel: '.chapters .chapter', from: { y: 42, opacity: 0 } }
    ];
    groups.forEach(function (g) {
      var els = gsap.utils.toArray(g.sel);
      if (!els.length) return;
      gsap.set(els, g.from);
      ScrollTrigger.create({
        trigger: els[0], start: 'top 86%',
        onEnter: function () {
          gsap.to(els, {
            y: 0, opacity: 1, scale: 1, filter: 'blur(0px)',
            duration: 1.0, ease: 'expo.out', stagger: 0.1, overwrite: true
          });
        }
      });
    });
  }

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
})();
