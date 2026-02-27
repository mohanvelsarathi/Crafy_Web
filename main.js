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
   1. HERO WAVE ANIMATION
   Three-layer left-to-right flowing sine wave with canvas glow.

   Architecture:
     • Each WAVE layer has its own amplitude, frequency, phase
       speed, stroke width, and alpha — drawn back-to-front.
     • shadowBlur + shadowColor create the purple glow halo.
     • A horizontal gradient (left → mid → right) is re-created
       each frame to match the exact purple palette colours.
     • Phase offset advances every frame → seamless loop L→R.
     • IntersectionObserver pauses RAF when hero is off-screen.
════════════════════════════════════════════════════════════ */
(function initWave() {
    const canvas = document.getElementById('waveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, raf;
    let phase = 0;
    let visible = true;

    /* Interactive state */
    let mx = -1000, my = -1000;
    let pmx = -1000, pmy = -1000;
    let splashForce = 0;
    let splashX = 0;
    const particles = [];

    /* ── Resize ────────────────────────────────────────────── */
    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    /* Mouse tracking */
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseleave', () => {
        mx = -1000; my = -1000;
    });

    /* ── Wave layer configs (back → front) ─────────────────── */
    const LAYERS = [
        { ampRatio: 0.13, freq: 1.5, speed: 0.40, phaseOff: 0.0, lineW: 90, blur: 80, alpha: 0.18 },
        { ampRatio: 0.11, freq: 1.5, speed: 0.55, phaseOff: 0.5, lineW: 40, blur: 30, alpha: 0.45 },
        { ampRatio: 0.10, freq: 1.5, speed: 0.70, phaseOff: 1.0, lineW: 8, blur: 10, alpha: 0.85 },
    ];

    /* Purple gradient colours */
    const C_LEFT = '#9E56FF';
    const C_MID = '#7F34E3';
    const C_RIGHT = '#BC8AFF';

    function spawnParticles(x, y) {
        if (particles.length > 60) return; // cap
        const count = 4 + Math.random() * 6;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.02,
                size: 2 + Math.random() * 3
            });
        }
    }

    /* ── Draw one layer ────────────────────────────────────── */
    function drawLayer(layer, t) {
        const amp = H * layer.ampRatio;
        const centY = H * 0.5;
        const freq = layer.freq;
        const step = 4;

        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, C_LEFT);
        grad.addColorStop(0.5, C_MID);
        grad.addColorStop(1, C_RIGHT);

        ctx.save();
        ctx.lineWidth = layer.lineW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = grad;
        ctx.shadowColor = C_MID;
        ctx.shadowBlur = layer.blur;
        ctx.globalAlpha = layer.alpha;

        ctx.beginPath();
        for (let x = 0; x <= W + step; x += step) {
            const angle = (x / W) * freq * Math.PI * 2 - t * layer.speed + layer.phaseOff;

            /* Ripple perturbation calculation */
            let perturb = 0;
            if (splashForce > 0) {
                const d = Math.abs(x - splashX);
                const inf = Math.exp(-(d * d) / 6000);
                perturb = inf * Math.sin(d * 0.03 - t * 12) * splashForce;
            }

            const y = centY + Math.sin(angle) * amp + perturb;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawParticles() {
        if (!particles.length) return;
        ctx.save();
        ctx.shadowColor = C_LEFT;
        ctx.shadowBlur = 12;

        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // gravity
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life * 0.8;
            ctx.fillStyle = (Math.random() > 0.5) ? '#FFFFFF' : C_MID;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /* ── Main render loop ──────────────────────────────────── */
    let last = null;

    function render(now) {
        if (!visible) { raf = requestAnimationFrame(render); return; }

        if (last === null) last = now;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        phase += dt;

        /* Check wave intersection */
        if (mx > 0 && pmx > 0) {
            const edge = LAYERS[2];
            const waveY = H * 0.5 + Math.sin((mx / W) * edge.freq * Math.PI * 2 - phase * edge.speed + edge.phaseOff) * (H * edge.ampRatio);
            const pWaveY = H * 0.5 + Math.sin((pmx / W) * edge.freq * Math.PI * 2 - phase * edge.speed + edge.phaseOff) * (H * edge.ampRatio);

            const dist = my - waveY;
            const pDist = pmy - pWaveY;

            // if crossed over the line
            if (dist * pDist <= 0 || (Math.abs(dist) < 25 && Math.abs(my - pmy) > 3)) {
                spawnParticles(mx, waveY);
                splashForce = Math.min(splashForce + 15, 40); // add to splash energy
                splashX = mx;
            }
        }

        pmx = mx; pmy = my; // update previous cursor
        splashForce *= 0.94; // dampen splash

        ctx.clearRect(0, 0, W, H);

        LAYERS.forEach(layer => drawLayer(layer, phase));
        drawParticles();

        raf = requestAnimationFrame(render);
    }

    raf = requestAnimationFrame(render);

    /* ── Pause off-screen for performance ──────────────────── */
    const heroEl = canvas.closest('.hero') || canvas.parentElement;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
        }, { threshold: 0 }).observe(heroEl);
    }
})();


/* ═══════════════════════════════════════════════════════════
   2. NAVBAR — Active link & background on scroll
════════════════════════════════════════════════════════════ */
(function initNavbar() {
    const navbar = document.querySelector('.navbar');
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
        threshold: 0.12,
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
        err.className = 'form-error';
        err.textContent = message;
        err.setAttribute('role', 'alert');
        err.style.cssText = 'color:#EC4899; font-size:12px; margin-top:-10px; display:block;';

        input.insertAdjacentElement('afterend', err);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const message = form.message.value.trim();

        /* Reset previous error state */
        form.querySelectorAll('.form-error').forEach((el) => el.remove());
        form.querySelectorAll('.form-input').forEach((el) => (el.style.borderColor = ''));

        let hasError = false;

        if (!fullName) { showError(form.fullName, 'Please enter your full name.'); hasError = true; }
        if (!EMAIL_REGEX.test(email)) { showError(form.email, 'Please enter a valid email address.'); hasError = true; }
        if (!message) { showError(form.message, 'Please enter your message.'); hasError = true; }

        if (hasError) return;

        /* Show success state on the submit button */
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.textContent;

        btn.textContent = '✓ MESSAGE SENT!';
        btn.disabled = true;
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
            btn.style.background = '';
            form.reset();
        }, 3500);
    });
})();


/* ═══════════════════════════════════════════════════════════
   7. PAGE FRAME SCROLL
   Show bottom border only when reaching the footer.
════════════════════════════════════════════════════════════ */
(function initPageFrame() {
    const frame = document.querySelector('.page-frame');
    const footer = document.querySelector('.footer');
    if (!frame || !footer) return;

    function onScroll() {
        const scrolled = window.scrollY + window.innerHeight;
        const limit = document.documentElement.scrollHeight - 20;
        frame.classList.toggle('show-bottom', scrolled >= limit);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
})();
