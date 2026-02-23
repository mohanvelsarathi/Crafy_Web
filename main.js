/**
 * CRAFY — main.js
 *
 * Modules (IIFEs — isolated scope, no global pollution):
 *   1. Aurora Canvas Animation
 *   2. Navbar  — active link & background on scroll
 *   3. Hamburger Menu
 *   4. Hero Entry Animations
 *   5. Scroll Reveal  (IntersectionObserver)
 *   6. Contact Form   — validation + submit feedback
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   1. AURORA CANVAS ANIMATION
   Paints a multi-layer glowing sine-wave that loops infinitely.

   Cursor interaction:
     • Cursor proximity to the wave builds noiseAmt ( 0 → 1 )
     • buildPath scatters path points via a multi-harmonic noise
       function weighted by a Gaussian envelope centred on the
       cursor's X position → wave "blurs apart" on contact
     • shadowBlur blooms in the disruption zone for a glow flare
     • noiseAmt decays smoothly after the cursor leaves
════════════════════════════════════════════════════════════ */
(function initAurora() {
    const canvas = document.getElementById('auroraCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, t = 0;

    /* Resize canvas to its CSS size */
    function resize() {
        W = canvas.width  = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* Wave layer definitions — back (diffuse) → front (crisp core) */
    const WAVES = [
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 130, blur: 120, alpha: 0.07, color: '#6600bb' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth:  60, blur:  70, alpha: 0.16, color: '#8B00EE' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth:  22, blur:  28, alpha: 0.32, color: '#A855F7' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth:   8, blur:  10, alpha: 0.60, color: '#CC80FF' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth:   3, blur:   4, alpha: 0.88, color: '#E5B3FF' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 1.5, blur:   0, alpha: 1.00, color: '#FFFFFF' },
    ];

    const SEGMENTS = 700;

    /* Noise & interaction tuning constants */
    const NOISE_R    = 0.28;  // influence zone (fraction of canvas width)
    const NOISE_AMP  = 0.11;  // max scatter amplitude (fraction of canvas height)
    const EASE_IN    = 0.06;  // noiseAmt rise speed
    const EASE_OUT   = 0.04;  // noiseAmt decay speed (longer tail)
    const PROX_ZONE  = 0.38;  // Y proximity window (fraction of H)

    /* Cursor state */
    let mouseX  = -9999;
    let mouseY  = -9999;
    let onHero  = false;
    let noiseAmt = 0;   // 0 = clean wave | 1 = full noise scatter

    /* canvas has pointer-events:none — listen on the hero section instead */
    const heroEl = canvas.closest('.hero') || canvas.parentElement;

    heroEl.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouseX = e.clientX - r.left;
        mouseY = e.clientY - r.top;
        onHero = true;
    }, { passive: true });

    heroEl.addEventListener('mouseleave', () => { onHero = false; });

    /* ── Helpers ───────────────────────────────────────────── */

    /** Reference wave Y coordinate at canvas-space x */
    function refWaveY(x, time) {
        const w = WAVES[0];
        return H * 0.5 + Math.sin((x / W) * w.freq * Math.PI * 2 + time * w.speed) * H * w.amp;
    }

    /** Gaussian envelope centred on mouseX */
    function envelope(x) {
        const dx = x - mouseX;
        const r  = NOISE_R * W;
        return Math.exp(-0.5 * (dx / r) * (dx / r));
    }

    /**
     * Multi-harmonic pseudo-noise — deterministic but chaotic.
     * seed offsets each wave layer so they scatter independently.
     * Returns a value in [-1, +1].
     */
    function noiseVal(nx, time, seed) {
        const s = seed * 7.391;
        return (
            Math.sin(nx *  31.4 + time *  8.2 + s        ) * 0.38 +
            Math.sin(nx *  67.1 + time * 13.7 + s * 1.61 ) * 0.27 +
            Math.sin(nx *  17.9 + time *  5.3 + s * 2.71 ) * 0.20 +
            Math.sin(nx * 113.0 + time * 21.0 + s * 0.91 ) * 0.15
        );
    }

    /** Build one wave layer path — noisy when noiseAmt > 0 */
    function buildPath(wave, time, layerIdx) {
        const cy      = H * 0.5;
        const amp     = H * wave.amp;
        const rad     = wave.freq * Math.PI * 2;
        const maxDisp = H * NOISE_AMP * noiseAmt;

        ctx.beginPath();
        for (let i = 0; i <= SEGMENTS; i++) {
            const nx   = i / SEGMENTS;
            const x    = nx * W;
            const base = cy + Math.sin(nx * rad + time * wave.speed) * amp;

            const scatter = noiseAmt > 0.01
                ? noiseVal(nx, time, layerIdx) * maxDisp * envelope(x)
                : 0;

            const y = base + scatter;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
    }

    /* ── Main draw loop ────────────────────────────────────── */
    let last     = null;
    let smoothDt = 0.016;

    function draw(now) {
        if (last === null) last = now;
        const raw = Math.min((now - last) / 1000, 0.05);
        last = now;
        smoothDt = smoothDt * 0.88 + raw * 0.12;
        t += smoothDt;

        /* Update noise strength based on cursor proximity to wave */
        if (onHero) {
            const wy     = refWaveY(mouseX, t);
            const dist   = Math.abs(mouseY - wy);
            const target = Math.max(0, 1 - dist / (H * PROX_ZONE));
            noiseAmt     = noiseAmt + (target - noiseAmt) * EASE_IN;
        } else {
            noiseAmt = noiseAmt * (1 - EASE_OUT);  // smooth tail-off
        }

        /* Extra shadowBlur bloom in the disruption zone */
        const blurBoost = noiseAmt * 65;

        ctx.clearRect(0, 0, W, H);

        for (let li = 0; li < WAVES.length; li++) {
            const wave = WAVES[li];
            ctx.save();
            ctx.lineWidth   = wave.lineWidth;
            ctx.strokeStyle = wave.color;
            ctx.shadowColor = wave.color;
            ctx.shadowBlur  = wave.blur + blurBoost * (1 - li / WAVES.length);
            ctx.globalAlpha = wave.alpha;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            buildPath(wave, t, li);
            ctx.stroke();
            ctx.restore();
        }

        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();


/* ═══════════════════════════════════════════════════════════
   2. NAVBAR — Active link & background on scroll
════════════════════════════════════════════════════════════ */
(function initNavbar() {
    const navbar   = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('main section[id]');

    function onScroll() {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
        updateActiveLink();
    }

    /** Highlight the nav link whose section is currently in view */
    function updateActiveLink() {
        let current = '';

        sections.forEach((sec) => {
            if (sec.getBoundingClientRect().top <= 100) {
                current = sec.id;
            }
        });

        navLinks.forEach((link) => {
            const isActive = link.getAttribute('href') === `#${current}`;
            link.classList.toggle('active', isActive);
            isActive
                ? link.setAttribute('aria-current', 'page')
                : link.removeAttribute('aria-current');
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();   // run once on page load
})();


/* ═══════════════════════════════════════════════════════════
   3. HAMBURGER MENU
════════════════════════════════════════════════════════════ */
(function initHamburger() {
    const btn   = document.querySelector('.hamburger');
    const menu  = document.getElementById('mobile-menu');
    const links = document.querySelectorAll('.mobile-link');
    if (!btn || !menu) return;

    function toggle(open) {
        btn.setAttribute('aria-expanded', String(open));
        if (open) {
            menu.removeAttribute('hidden');
            menu.style.display = 'block';
        } else {
            menu.setAttribute('hidden', '');
            menu.style.display = '';
        }
    }

    btn.addEventListener('click', () => {
        toggle(btn.getAttribute('aria-expanded') !== 'true');
    });

    /* Close when a mobile link is tapped */
    links.forEach((link) => link.addEventListener('click', () => toggle(false)));

    /* Close on outside click */
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            toggle(false);
        }
    });

    /* Close on Escape */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggle(false);
    });
})();


/* ═══════════════════════════════════════════════════════════
   4. HERO ENTRY ANIMATIONS
   Small delay ensures fonts are rendered before elements appear.
════════════════════════════════════════════════════════════ */
(function initHeroAnimations() {
    const els = document.querySelectorAll('.animate-fade-up');
    setTimeout(() => {
        els.forEach((el) => el.classList.add('is-visible'));
    }, 80);
})();


/* ═══════════════════════════════════════════════════════════
   5. SCROLL REVEAL — IntersectionObserver
   Handles: .js-fade-left / .js-fade-right / .js-fade-up / .js-stagger
════════════════════════════════════════════════════════════ */
(function initScrollReveal() {
    const selector = '.js-fade-left, .js-fade-right, .js-fade-up, .js-stagger';

    /* Skip animations for users who prefer reduced motion */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll(selector).forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const el = entry.target;

            if (el.classList.contains('js-stagger')) {
                const idx = parseInt(el.dataset.index || '0', 10);
                el.style.transitionDelay = `${idx * 0.12}s`;
            }

            el.classList.add('is-visible');
            observer.unobserve(el);
        });
    }, {
        threshold:   0.12,
        rootMargin: '0px 0px -60px 0px',
    });

    document.querySelectorAll(selector).forEach((el) => observer.observe(el));
})();


/* ═══════════════════════════════════════════════════════════
   6. CONTACT FORM — Validation + submit feedback
════════════════════════════════════════════════════════════ */
(function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /** Attach an inline error message below an input */
    function showError(input, message) {
        input.style.borderColor = '#EC4899';

        const err = document.createElement('span');
        err.className   = 'form-error';
        err.textContent = message;
        err.setAttribute('role', 'alert');
        err.style.cssText = 'color:#EC4899; font-size:12px; margin-top:-10px; display:block;';

        input.insertAdjacentElement('afterend', err);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const fullName = form.fullName.value.trim();
        const email    = form.email.value.trim();
        const message  = form.message.value.trim();

        /* Reset previous error state */
        form.querySelectorAll('.form-error').forEach((el) => el.remove());
        form.querySelectorAll('.form-input').forEach((el) => (el.style.borderColor = ''));

        let hasError = false;

        if (!fullName)                    { showError(form.fullName, 'Please enter your full name.');           hasError = true; }
        if (!EMAIL_REGEX.test(email))     { showError(form.email,    'Please enter a valid email address.');   hasError = true; }
        if (!message)                     { showError(form.message,  'Please enter your message.');            hasError = true; }

        if (hasError) return;

        /* Show success state on the submit button */
        const btn      = form.querySelector('button[type="submit"]');
        const original = btn.textContent;

        btn.textContent  = '✓ MESSAGE SENT!';
        btn.disabled     = true;
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

        setTimeout(() => {
            btn.textContent      = original;
            btn.disabled         = false;
            btn.style.background = '';
            form.reset();
        }, 3500);
    });
})();
