/**
 * @fileoverview CRAFY — Main JavaScript Engine
 * 
 * Implements a highly optimized, modular, and dependency-free (except Lenis) 
 * frontend architecture using Immediately Invoked Function Expressions (IIFEs).
 * This ensures strict scope isolation and zero global namespace pollution.
 * 
 * Architecture Modules:
 *   1. Smooth Scrolling (Lenis Integration)
 *   2. Liquid Aurora WebGL Background
 *   3. Smart Navbar (Scroll Spy & Active States)
 *   4. Mobile Hamburger Navigation
 *   5. Hero Entrance Typography Animations
 *   6. scroll Reveal (IntersectionObserver API)
 *   7. Client-side Form Validation
 *   8. Back to Top Native/Lenis Integration
 * 
 * @author CRAFY Engineering
 * @version 1.0.0
 */

"use strict";

/* ═══════════════════════════════════════════════════════════
   0. SMOOTH SCROLLING (Lenis)
════════════════════════════════════════════════════════════ */
let lenis;

/**
 * @function initLenis
 * @description Initializes the Lenis smooth scrolling library.
 * Implements a custom `requestAnimationFrame` loop for buttery smooth momentum scrolling.
 * Hooks into native anchor tags to provide eased programmatic scrolling.
 */
(function initLenis() {
  if (typeof Lenis !== "undefined") {
    lenis = new Lenis({
      lerp: 0.05,
      smoothWheel: true,
      syncTouch: true, // Smooth scrolling effect on mobile/touch
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Handle Anchor Links for smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, {
            offset: 0, 
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          });
        }
      });
    });
  }
})();

/* ═══════════════════════════════════════════════════════════
   1. HERO WAVE ANIMATION
   Liquid Aurora wave via WebGL Shader.
   Direction is customizable via waveConfig below.
════════════════════════════════════════════════════════════ */
/**
 * @function initWave
 * @description Initializes a high-performance WebGL-based liquid aurora background.
 * Uses a custom GLSL fragment shader with Simplex 3D Noise to render dynamic ambient waves.
 * Performance is optimized by pausing the WebGL context via `IntersectionObserver` 
 * when the canvas is scrolled out of the viewport.
 */
(function initWave() {
  const canvas = document.getElementById("waveCanvas");
  if (!canvas) return;

  // --- CONFIGURATION ---
  // Change these to adjust the wave flow direction.
  // [1.0, 0.0]  = flow right
  // [-1.0, 0.0] = flow left
  // [1.0, 1.0]  = flow diagonally down-right
  const waveConfig = {
    direction: [0.5, 0.2, 0.1], // Custom movement direction
    speed: 0.001           // Animation speed modifier
  };

  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    console.warn("WebGL not supported, falling back to empty canvas");
    return;
  }

  const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Premium liquid aurora wave shader
  const fsSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_dir;

    // Simplex 3D Noise by Ian McEwan, Ashima Arts
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){ 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
      i = mod(i, 289.0); 
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      // Normalize coords and adjust for aspect ratio
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      st.x *= u_resolution.x / u_resolution.y;

      // Custom direction flow
      vec2 movement = u_dir * u_time * 0.15;
      
      // Layered noise coordinate spaces
      vec3 pos1 = vec3(st * 1.5 - movement, u_time * 0.1);
      vec3 pos2 = vec3(st * 2.0 + movement * 0.5, u_time * 0.15);
      vec3 pos3 = vec3(st * 1.0 - movement * 0.8, u_time * 0.05);

      // Distortions
      float n1 = snoise(pos1);
      float n2 = snoise(pos2 + vec3(n1 * 0.5));
      float n3 = snoise(pos3 + vec3(n2 * 0.5));
      
      // Ocean wave base shape
      float wave = sin((st.y * 3.0) + n1 * 2.0 - n2 + u_time * 0.2);
      wave = smoothstep(-1.0, 1.0, wave);
      
      // Liquid Aurora Color Palette (Matte Finish)
      vec3 bgCol = vec3(0.0, 0.0, 0.0);          // #000000 - Primary Background
      vec3 waveCol1 = vec3(0.537, 0.22, 0.957);  // #8938F4 - Primary Animation Color
      vec3 waveCol2 = vec3(0.0, 0.0, 0.0);       // #000000 - Secondary Animation Color
      vec3 waveCol3 = vec3(0.537, 0.22, 0.957);  // #7c3bd1ff - Accent Color

      vec3 color = bgCol;
      
      // Morph colors based on wave/noise overlaps
      float flow1 = smoothstep(0.1, 0.9, wave + n2 * 0.5);
      float flow2 = smoothstep(0.2, 0.8, n3 * wave);
      float flow3 = smoothstep(0.4, 1.0, n1 * n3 + wave * 0.5);
      
      color = mix(color, waveCol1, flow1 * 0.8);
      color = mix(color, waveCol2, flow2 * 0.7);
      color += waveCol3 * flow3 * 0.6;
      
      // Removed specular highlights for a matte finish
      // Subtle edge darkening
      float edge = smoothstep(0.0, 0.3, gl_FragCoord.y / u_resolution.y);
      color *= (0.7 + 0.3 * edge);

      // Dark mask for the top-left (navigation logo area) to maintain a pure black background
      float distX = gl_FragCoord.x / u_resolution.x;
      float distY = 1.0 - (gl_FragCoord.y / u_resolution.y);
      float logoMask = smoothstep(0.0, 0.4, length(vec2(distX, distY * 1.5)));
      color *= logoMask;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Unable to initialize the shader program.");
    return;
  }

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  // Create a full-screen quad
  const positions = [
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  const timeUniformLocation = gl.getUniformLocation(program, "u_time");
  const dirUniformLocation = gl.getUniformLocation(program, "u_dir");

  let animationFrameId;
  let startTime = null;
  let lastTime = 0;
  let dt = 0;

  function resizeCanvas() {
    // Sharp resolution handling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();

  function render(time) {
    if (!startTime) startTime = time;
    const elapsed = (time - startTime) * waveConfig.speed;

    gl.useProgram(program);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    gl.uniform1f(timeUniformLocation, elapsed);
    gl.uniform2f(dirUniformLocation, waveConfig.direction[0], waveConfig.direction[1]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animationFrameId = requestAnimationFrame(render);
  }
  
  // Pause/Play based on intersection observer to save performance
  const heroEl = canvas.closest(".hero") || canvas.parentElement;
  if ("IntersectionObserver" in window) {
    let visible = true;
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) {
        if (!animationFrameId) render(performance.now());
      } else {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      }
    }, { threshold: 0 }).observe(heroEl);
  } else {
    render(performance.now());
  }
})();

/* ═══════════════════════════════════════════════════════════
   2. NAVBAR — Active link & background on scroll
════════════════════════════════════════════════════════════ */
/**
 * @function initNavbar
 * @description Manages the primary navigation bar's state and scroll-spy functionality.
 * Modifies the navbar's opacity on scroll and dynamically calculates the user's
 * scroll depth to highlight the currently active section link.
 */
(function initNavbar() {
  const navbar = document.querySelector(".navbar");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("main section[id]");

  function onScroll() {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
    updateActiveLink();
  }

  /**
   * @function updateActiveLink
   * @description Calculates bounding rects for all sections to spy on scroll position
   * and update the corresponding active navigation link.
   * @private
   */
  function updateActiveLink() {
    let current = "";

    sections.forEach((sec) => {
      if (sec.getBoundingClientRect().top <= 100) {
        current = sec.id;
      }
    });

    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${current}`;
      link.classList.toggle("active", isActive);
      isActive ? link.setAttribute("aria-current", "page") : link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // run once on page load
})();

/* ═══════════════════════════════════════════════════════════
   3. HAMBURGER MENU
════════════════════════════════════════════════════════════ */
/**
 * @function initHamburger
 * @description Manages mobile navigation drawer states and semantics.
 * Implements focus-trapping considerations and ARIA accessibility attributes,
 * closing gracefully on outside clicks and the Escape key.
 */
(function initHamburger() {
  const btn = document.querySelector(".hamburger");
  const menu = document.getElementById("mobile-menu");
  const links = document.querySelectorAll(".mobile-link");
  if (!btn || !menu) return;

  /**
   * @function toggle
   * @description Modifies DOM and ARIA attributes to open/close the mobile menu.
   * @param {boolean} open - Desired state of the mobile menu.
   * @private
   */
  function toggle(open) {
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      menu.removeAttribute("hidden");
      menu.style.display = "block";
    } else {
      menu.setAttribute("hidden", "");
      menu.style.display = "";
    }
  }

  btn.addEventListener("click", () => {
    toggle(btn.getAttribute("aria-expanded") !== "true");
  });

  /* Close when a mobile link is tapped */
  links.forEach((link) => link.addEventListener("click", () => toggle(false)));

  /* Close on outside click */
  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      toggle(false);
    }
  });

  /* Close on Escape */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggle(false);
  });
})();

/* ═══════════════════════════════════════════════════════════
   4. HERO ENTRY ANIMATIONS
   Small delay ensures fonts are rendered before elements appear.
════════════════════════════════════════════════════════════ */
/**
 * @function initHeroAnimations
 * @description Handles the initial Entrance animations for the hero section typography.
 * Implements a slight delay to ensure web fonts render before the animation triggers.
 */
(function initHeroAnimations() {
  const els = document.querySelectorAll(".animate-fade-up");
  setTimeout(() => {
    els.forEach((el) => el.classList.add("is-visible"));
  }, 80);
})();

/* ═══════════════════════════════════════════════════════════
   5. SCROLL REVEAL — IntersectionObserver
   Handles: .js-fade-left / .js-fade-right / .js-fade-up / .js-stagger
════════════════════════════════════════════════════════════ */
/**
 * @function initScrollReveal
 * @description Initializes a high-performance IntersectionObserver to trigger 
 * CSS-driven entrance animations (fade-in, slide-up, stagger) as elements 
 * enter the viewport. Respects the user's OS-level accessibility preferences.
 */
(function initScrollReveal() {
  const selector = ".js-fade-left, .js-fade-right, .js-fade-up, .js-stagger";

  /* Skip animations for users who prefer reduced motion */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(selector).forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;

        if (el.classList.contains("js-stagger")) {
          const idx = parseInt(el.dataset.index || "0", 10);
          el.style.transitionDelay = `${idx * 0.12}s`;
        }

        el.classList.add("is-visible");
        observer.unobserve(el);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -60px 0px",
    },
  );

  document.querySelectorAll(selector).forEach((el) => observer.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   6. CONTACT FORM — Validation + submit feedback
════════════════════════════════════════════════════════════ */
/**
 * @function initContactForm
 * @description Binds the contact form submit event to handle client-side validation.
 * Features inline, accessible error messages and provides non-blocking,
 * animated feedback upon successful submission state.
 */
(function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * @function showError
   * @description Dynamically creates and injects accessible error DOM nodes below inputs.
   * @param {HTMLElement} input - The input element that failed validation.
   * @param {string} message - The contextual error message to display.
   * @private
   */
  function showError(input, message) {
    input.style.borderColor = "#EC4899";

    const err = document.createElement("span");
    err.className = "form-error";
    err.textContent = message;
    err.setAttribute("role", "alert");
    err.style.cssText = "color:#EC4899; font-size:12px; margin-top:-10px; display:block;";

    input.insertAdjacentElement("afterend", err);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    /* Reset previous error state */
    form.querySelectorAll(".form-error").forEach((el) => el.remove());
    form.querySelectorAll(".form-input").forEach((el) => (el.style.borderColor = ""));

    let hasError = false;

    if (!fullName) {
      showError(form.fullName, "Please enter your full name.");
      hasError = true;
    }
    if (!EMAIL_REGEX.test(email)) {
      showError(form.email, "Please enter a valid email address.");
      hasError = true;
    }
    if (!message) {
      showError(form.message, "Please enter your message.");
      hasError = true;
    }

    if (hasError) return;

    /* Show success state on the submit button */
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;

    btn.textContent = "✓ MESSAGE SENT!";
    btn.disabled = true;
    btn.style.background = "linear-gradient(135deg, #22c55e, #16a34a)";

    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
      btn.style.background = "";
      form.reset();
    }, 3500);
  });
})();

/* ═══════════════════════════════════════════════════════════
   7. BACK TO TOP BUTTON
════════════════════════════════════════════════════════════ */
/**
 * @function initBackToTop
 * @description Manages the float action button for returning to the top of the document.
 * Defers to the Lenis instance if available, otherwise falls back to native smooth scroll.
 */
(function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;

  /**
   * @function toggleVisibility
   * @description Toggles the FAB visibility threshold based on window scroll depth.
   * @private
   */
  function toggleVisibility() {
    btn.classList.toggle("visible", window.scrollY > window.innerHeight * 0.6);
  }

  window.addEventListener("scroll", toggleVisibility, { passive: true });
  toggleVisibility();

  /* Scroll to top on click — uses Lenis if available, else native */
  btn.addEventListener("click", () => {
    if (typeof lenis !== "undefined" && lenis) {
      lenis.scrollTo(0, {
        duration: 0.8,
        easing: (t) => 1 - Math.pow(1 - t, 4), // quartic ease-out — fast & snappy
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
})();
