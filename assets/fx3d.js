/* ==========================================================================
   fx3d — "דקונסטרוקציה"
   WebGL shatter: the dish photo breaks into hundreds of 3D triangle
   shards and reassembles, driven by scroll (GSAP ScrollTrigger scrub).
   Fallback: static <img> when WebGL / motion unavailable.
   ========================================================================== */
(function () {
  'use strict';

  var section = document.querySelector('[data-fx3d]');
  if (!section) return;

  var wrap = section.querySelector('[data-fx3d-canvas]');
  var IMG_SRC = section.getAttribute('data-fx3d-src') || 'assets/real/liav_post_5.jpg';

  // ---- bail-outs → keep the static <img> fallback visible ----
  var a11y = {};
  try { a11y = JSON.parse(localStorage.getItem('liav-a11y')) || {}; } catch (e) {}
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || a11y.motion === 'off';
  if (reduceMotion || !window.THREE || !window.gsap || !window.ScrollTrigger) return;

  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (!webglOK()) return;

  var isMobile = matchMedia('(max-width: 720px)').matches;

  // ---- three.js scene ----
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  wrap.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.z = 4.2;

  var group = new THREE.Group();
  scene.add(group);

  var uniforms = {
    uMap:      { value: null },
    uProgress: { value: 1 },      // 1 = shattered, 0 = whole
    uTime:     { value: 0 }
  };

  var vert = [
    'attribute vec3 aCentroid;',
    'attribute vec3 aDir;',
    'attribute float aRot;',
    'attribute float aDelay;',
    'uniform float uProgress;',
    'uniform float uTime;',
    'varying vec2 vUv;',
    'varying float vShade;',
    'mat3 rotAxis(vec3 axis, float a){',
    '  float s=sin(a), c=cos(a); float oc=1.0-c; vec3 ax=normalize(axis);',
    '  return mat3(oc*ax.x*ax.x+c, oc*ax.x*ax.y-ax.z*s, oc*ax.z*ax.x+ax.y*s,',
    '              oc*ax.x*ax.y+ax.z*s, oc*ax.y*ax.y+c, oc*ax.y*ax.z-ax.x*s,',
    '              oc*ax.z*ax.x-ax.y*s, oc*ax.y*ax.z+ax.x*s, oc*ax.z*ax.z+c);',
    '}',
    'void main(){',
    '  vUv = uv;',
    // per-shard progress with slight stagger by aDelay for organic feel
    '  float p = clamp(uProgress * (1.0 + aDelay * 0.55) - aDelay * 0.55, 0.0, 1.0);',
    '  float pe = p * p * (3.0 - 2.0 * p);', // smoothstep ease
    '  vec3 pos = position - aCentroid;',
    // tumble each shard around its own random axis
    '  pos = rotAxis(aDir, pe * aRot * 6.2831 + uTime * 0.12 * pe) * pos;',
    // scatter outward + toward camera
    '  vec3 fly = aDir * pe * 2.6;',
    '  fly.z = abs(fly.z) * 1.8 + sin(pe * 3.1415) * 0.45 * aDelay;',
    '  pos += aCentroid + fly;',
    '  vShade = 1.0 - pe * 0.55;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
    '}'
  ].join('\n');

  var frag = [
    'uniform sampler2D uMap;',
    'varying vec2 vUv;',
    'varying float vShade;',
    'void main(){',
    '  vec4 tex = texture2D(uMap, vUv);',
    '  gl_FragColor = vec4(tex.rgb * vShade, 1.0);',
    '}'
  ].join('\n');

  var PLANE_H = 2.9;
  var mesh = null;

  new THREE.TextureLoader().load(IMG_SRC, function (tex) {
    tex.encoding = THREE.sRGBEncoding;
    tex.minFilter = THREE.LinearFilter;
    uniforms.uMap.value = tex;

    var aspect = tex.image.width / tex.image.height;
    var W = PLANE_H * aspect, H = PLANE_H;
    var segX = isMobile ? 16 : 26;
    var segY = isMobile ? 22 : 34;

    var geo = new THREE.PlaneGeometry(W, H, segX, segY).toNonIndexed();
    var posAttr = geo.attributes.position;
    var triCount = posAttr.count / 3;

    var centroids = new Float32Array(posAttr.count * 3);
    var dirs = new Float32Array(posAttr.count * 3);
    var rots = new Float32Array(posAttr.count);
    var delays = new Float32Array(posAttr.count);

    for (var t = 0; t < triCount; t++) {
      var i0 = t * 3;
      var cx = 0, cy = 0, cz = 0;
      for (var k = 0; k < 3; k++) {
        cx += posAttr.getX(i0 + k); cy += posAttr.getY(i0 + k); cz += posAttr.getZ(i0 + k);
      }
      cx /= 3; cy /= 3; cz /= 3;
      // random unit-ish direction biased outward from centre
      var dx = cx / (W * 0.5) + (Math.random() - 0.5) * 1.6;
      var dy = cy / (H * 0.5) + (Math.random() - 0.5) * 1.6;
      var dz = (Math.random() - 0.5) * 2.0;
      var rot = (Math.random() - 0.5) * 2.0;
      var del = Math.random();
      for (var k2 = 0; k2 < 3; k2++) {
        var idx = i0 + k2;
        centroids[idx * 3] = cx; centroids[idx * 3 + 1] = cy; centroids[idx * 3 + 2] = cz;
        dirs[idx * 3] = dx; dirs[idx * 3 + 1] = dy; dirs[idx * 3 + 2] = dz;
        rots[idx] = rot;
        delays[idx] = del;
      }
    }
    geo.setAttribute('aCentroid', new THREE.BufferAttribute(centroids, 3));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
    geo.setAttribute('aRot', new THREE.BufferAttribute(rots, 1));
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));

    mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: uniforms, vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide
    }));
    group.add(mesh);

    section.classList.add('fx3d--on');   // hides the fallback <img>
    resize();
    buildScroll();
  });

  // ---- sizing ----
  function resize() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit plane height in view with a little padding
    var fov = camera.fov * Math.PI / 180;
    camera.position.z = (PLANE_H * 1.12) / (2 * Math.tan(fov / 2));
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // ---- scroll choreography: shattered → whole → shattered ----
  function buildScroll() {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=135%',
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true
      }
    });
    // shattered -> whole only. It STAYS whole once assembled (the pin releases
    // with the dish complete). Because scrub is bound to scroll, scrolling back
    // UP reverses the timeline and re-shatters it. Exactly the requested behavior.
    tl.fromTo(uniforms.uProgress, { value: 1 }, { value: 0, duration: 1.0, ease: 'none' }, 0)
      .fromTo(group.rotation, { y: 0.5, x: 0.14 }, { y: 0, x: 0, duration: 1.0, ease: 'none' }, 0);

    // caption resolves into view as the dish completes, and stays
    var cap = section.querySelector('[data-fx3d-cap]');
    if (cap) {
      tl.fromTo(cap, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.7);
    }
  }

  // ---- subtle pointer parallax (desktop) ----
  var tx = 0, ty = 0;
  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 0.22;
      ty = (e.clientY / window.innerHeight - 0.5) * -0.16;
    }, { passive: true });
  }

  // ---- render only while the section is near the viewport ----
  var active = false;
  ScrollTrigger.create({
    trigger: section, start: 'top 120%', end: 'bottom -20%',
    onToggle: function (self) { active = self.isActive; }
  });
  gsap.ticker.add(function (time) {
    if (!active || !mesh) return;
    uniforms.uTime.value = time;
    group.rotation.y += (tx - group.rotation.y) * 0.04;
    group.rotation.x += (ty - group.rotation.x) * 0.04;
    renderer.render(scene, camera);
  });
})();
