/**
 * CRAFY — main.js
 * Modules: Aurora, Navbar, Hamburger, ScrollReveal, StaggerItems, Form
 */

/* ═══════════════════════════════════════════════
   1. AURORA CANVAS ANIMATION
   Paints an animated glowing purple sine-wave
   that loops infinitely (8–12s feel).

   Cursor interaction:
     — Cursor proximity to wave line builds breakAmt (0→1)
     — buildPath applies a Gaussian outward displacement
       centred on cursorX  →  wave "breaks apart" smoothly
     — shadowBlur blooms in the disruption zone
     — Radial glow burst renders at the cursor-wave hit point
     — All transitions ease back to normal when cursor leaves
═══════════════════════════════════════════════ */
(function initAurora() {
    const canvas = document.getElementById('auroraCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, t = 0;

    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* Wave layers — back (diffuse) → front (crisp core) */
    const WAVES = [
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 130, blur: 120, alpha: 0.07, color: '#6600bb' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 60, blur: 70, alpha: 0.16, color: '#8B00EE' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 22, blur: 28, alpha: 0.32, color: '#A855F7' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 8, blur: 10, alpha: 0.60, color: '#CC80FF' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 3, blur: 4, alpha: 0.88, color: '#E5B3FF' },
        { amp: 0.22, freq: 1.10, speed: 0.28, lineWidth: 1.5, blur: 0, alpha: 1.00, color: '#FFFFFF' },
    ];

    const SEGMENTS = 700;

    /* ── Noise-blur tuning ──────────────────────────────── */
    const NOISE_R = 0.28;   // influence zone (fraction of canvas width)
    const NOISE_AMP = 0.11;   // max scatter amplitude (fraction of canvas height)
    const EASE_IN = 0.06;   // noiseAmt rise speed
    const EASE_OUT = 0.04;   // noiseAmt decay speed (longer tail)
    const PROX_ZONE = 0.38;   // Y proximity window (fraction of H)

    /* ── Cursor state ───────────────────────────────────── */
    let mouseX = -9999;
    let mouseY = -9999;
    let onHero = false;
    let noiseAmt = 0;          // 0 = clean wave | 1 = full noise blur

    /* Canvas has pointer-events:none — listen on hero section */
    const heroEl = canvas.closest('.hero') || canvas.parentElement;

    heroEl.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouseX = e.clientX - r.left;
        mouseY = e.clientY - r.top;
        onHero = true;
    }, { passive: true });

    heroEl.addEventListener('mouseleave', () => { onHero = false; });

    /* ── Helpers ─────────────────────────────────────────── */

    /* Reference wave Y at position x */
    function refWaveY(x, time) {
        const w = WAVES[0];
        return H * 0.5 + Math.sin((x / W) * w.freq * Math.PI * 2 + time * w.speed) * H * w.amp;
    }

    /* Gaussian envelope centred on mouseX */
    function envelope(x) {
        const dx = x - mouseX;
        const r = NOISE_R * W;
        return Math.exp(-0.5 * (dx / r) * (dx / r));
    }

    /*  Multi-harmonic pseudo-noise — deterministic but chaotic.
        seed offsets each wave layer so they scatter independently.
        Returns value in [-1, +1].                                  */
    function noiseVal(nx, time, seed) {
        const s = seed * 7.391;
        return (
            Math.sin(nx * 31.4 + time * 8.2 + s) * 0.38 +
            Math.sin(nx * 67.1 + time * 13.7 + s * 1.61) * 0.27 +
            Math.sin(nx * 17.9 + time * 5.3 + s * 2.71) * 0.20 +
            Math.sin(nx * 113 + time * 21.0 + s * 0.91) * 0.15
        );
    }

    /* Build noisy or clean path for one wave layer */
    function buildPath(wave, time, layerIdx) {
        const cy = H * 0.5;
        const amp = H * wave.amp;
        const rad = wave.freq * Math.PI * 2;
        const maxDisp = H * NOISE_AMP * noiseAmt;

        ctx.beginPath();
        for (let i = 0; i <= SEGMENTS; i++) {
            const nx = i / SEGMENTS;
            const x = nx * W;
            const base = cy + Math.sin(nx * rad + time * wave.speed) * amp;

            /* Noise displacement: scatter points within the envelope zone */
            const scatter = noiseAmt > 0.01
                ? noiseVal(nx, time, layerIdx) * maxDisp * envelope(x)
                : 0;

            const y = base + scatter;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
    }

    /* ── Main draw loop ──────────────────────────────────── */
    let last = null;
    let smoothDt = 0.016;

    function draw(now) {
        if (last === null) last = now;
        const raw = Math.min((now - last) / 1000, 0.05);
        last = now;
        smoothDt = smoothDt * 0.88 + raw * 0.12;
        t += smoothDt;

        /* Update noise strength based on cursor proximity to wave */
        if (onHero) {
            const wy = refWaveY(mouseX, t);
            const dist = Math.abs(mouseY - wy);
            const target = Math.max(0, 1 - dist / (H * PROX_ZONE));
            noiseAmt = noiseAmt + (target - noiseAmt) * EASE_IN;
        } else {
            noiseAmt = noiseAmt * (1 - EASE_OUT);   /* smooth tail-off */
        }

        /*  Extra shadowBlur bloom in the disrupted zone —
            outer layers swell most, giving a glowing-static look */
        const blurBoost = noiseAmt * 65;

        ctx.clearRect(0, 0, W, H);

        for (let li = 0; li < WAVES.length; li++) {
            const wave = WAVES[li];
            ctx.save();
            ctx.lineWidth = wave.lineWidth;
            ctx.strokeStyle = wave.color;
            ctx.shadowColor = wave.color;
            ctx.shadowBlur = wave.blur + blurBoost * (1 - li / WAVES.length);
            ctx.globalAlpha = wave.alpha;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            buildPath(wave, t, li);
            ctx.stroke();
            ctx.restore();
        }

        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();


/* ═══════════════════════════════════════════════
   2. NAVBAR — Active link & background on scroll
═══════════════════════════════════════════════ */
(function initNavbar() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('main section[id]');

    /* Scroll background */
    function onScroll() {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        updateActiveLink();
    }

    /* Highlight nav link matching current section */
    function updateActiveLink() {
        let current = '';
        sections.forEach(sec => {
            const top = sec.getBoundingClientRect().top;
            if (top <= 100) current = sec.id;
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();


/* ═══════════════════════════════════════════════
   3. HAMBURGER MENU
═══════════════════════════════════════════════ */
(function initHamburger() {
    const btn = document.querySelector('.hamburger');
    const menu = document.getElementById('mobile-menu');
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
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        toggle(!isOpen);
    });

    /* Close on link click */
    links.forEach(link => link.addEventListener('click', () => toggle(false)));

    /* Close on outside click */
    document.addEventListener('click', e => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            toggle(false);
        }
    });

    /* Close on Escape */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') toggle(false);
    });
})();


/* ═══════════════════════════════════════════════
   4. HERO — Trigger entry animations on load
═══════════════════════════════════════════════ */
(function initHeroAnimations() {
    const els = document.querySelectorAll('.animate-fade-up');
    /* Tiny delay so fonts are painted */
    setTimeout(() => {
        els.forEach(el => el.classList.add('is-visible'));
    }, 80);
})();


/* ═══════════════════════════════════════════════
   5. SCROLL REVEAL — IntersectionObserver
   Handles: js-fade-left, js-fade-right,
            js-fade-up, js-stagger
═══════════════════════════════════════════════ */
(function initScrollReveal() {
    /* Respect prefers-reduced-motion */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.js-fade-left, .js-fade-right, .js-fade-up, .js-stagger')
            .forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
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
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px',
    });

    document.querySelectorAll('.js-fade-left, .js-fade-right, .js-fade-up, .js-stagger')
        .forEach(el => observer.observe(el));
})();


/* ═══════════════════════════════════════════════
   6. CONTACT FORM — Validation + submit feedback
═══════════════════════════════════════════════ */
(function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const message = form.message.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        /* Clear previous errors */
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('.form-input').forEach(el => el.style.borderColor = '');

        let hasError = false;

        function showError(input, msg) {
            input.style.borderColor = '#EC4899';
            const err = document.createElement('span');
            err.className = 'form-error';
            err.textContent = msg;
            err.style.cssText = 'color:#EC4899;font-size:12px;margin-top:-10px;display:block;';
            err.setAttribute('role', 'alert');
            input.insertAdjacentElement('afterend', err);
            hasError = true;
        }

        if (!fullName) showError(form.fullName, 'Please enter your full name.');
        if (!emailRegex.test(email)) showError(form.email, 'Please enter a valid email address.');
        if (!message) showError(form.message, 'Please enter your message.');

        if (hasError) return;

        /* Success feedback */
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.textContent = '✓ MESSAGE SENT!';
        btn.disabled = true;
        btn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';

        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
            btn.style.background = '';
            form.reset();
        }, 3500);
    });
})();
