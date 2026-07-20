/* ============================================================
   ELANIIN REPORT SYSTEM — ANIMATIONS
   Vanilla JS, no external dependencies
   ============================================================ */

(function () {
  'use strict';

  /* --------------------------------------------------------
     1. SCROLL REVEAL
     Observes .reveal elements and animates them in with a
     staggered delay when they enter the viewport.
  -------------------------------------------------------- */
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    // Set initial state
    elements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity 400ms ease-out, transform 400ms ease-out';
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target;

        // Calculate stagger based on sibling index
        const parent = el.parentElement;
        const siblings = parent ? Array.from(parent.querySelectorAll('.reveal')) : [el];
        const index = siblings.indexOf(el);
        const delay = index * 80;

        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, delay);

        observer.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
  }


  /* --------------------------------------------------------
     2. COUNT-UP
     Elements with data-count="N" animate from 0 to N when
     they enter the viewport. Supports integers and decimals.
  -------------------------------------------------------- */
  function initCountUp() {
    const elements = document.querySelectorAll('[data-count]');
    if (!elements.length) return;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function animateCount(el) {
      const target = parseFloat(el.dataset.count);
      const decimals = el.dataset.countDecimals ? parseInt(el.dataset.countDecimals) : 0;
      const prefix = el.dataset.countPrefix || '';
      const suffix = el.dataset.countSuffix || '';
      const duration = 1200;
      const startTime = performance.now();

      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = target * easeOut(progress);

        el.textContent = prefix + current.toFixed(decimals) + suffix;

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = prefix + target.toFixed(decimals) + suffix;
        }
      }

      requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 });

    elements.forEach(el => observer.observe(el));
  }


  /* --------------------------------------------------------
     3. SCROLL PROGRESS
     Updates #scroll-progress width as a percentage of how
     far down the page the user has scrolled.
  -------------------------------------------------------- */
  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    function update() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct.toFixed(2) + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }


  /* --------------------------------------------------------
     4. GANTT BARS
     Calculates left offset and width for each .gantt-bar
     element based on data-start and data-end attributes
     (format: "YYYY-MM") relative to the visible month range
     stored on the parent .gantt-grid element via
     data-from="YYYY-MM" and data-to="YYYY-MM".
  -------------------------------------------------------- */
  function initGanttBars() {
    const grids = document.querySelectorAll('.gantt-grid');
    if (!grids.length) return;

    function monthsFrom(fromStr, toStr) {
      const [fy, fm] = fromStr.split('-').map(Number);
      const [ty, tm] = toStr.split('-').map(Number);
      return (ty - fy) * 12 + (tm - fm) + 1; // inclusive
    }

    function monthOffset(fromStr, dateStr) {
      const [fy, fm] = fromStr.split('-').map(Number);
      const [dy, dm] = dateStr.split('-').map(Number);
      return (dy - fy) * 12 + (dm - fm);
    }

    grids.forEach(grid => {
      const from = grid.dataset.from;
      const to = grid.dataset.to;
      if (!from || !to) return;

      const totalMonths = monthsFrom(from, to);

      grid.querySelectorAll('.gantt-bar').forEach(bar => {
        const start = bar.dataset.start;
        const end = bar.dataset.end;
        if (!start || !end) return;

        const startOffset = Math.max(0, monthOffset(from, start));
        const endOffset = Math.min(totalMonths - 1, monthOffset(from, end));
        const spanMonths = endOffset - startOffset + 1;

        bar.style.left = ((startOffset / totalMonths) * 100).toFixed(2) + '%';
        bar.style.width = ((spanMonths / totalMonths) * 100).toFixed(2) + '%';
      });
    });
  }


  /* --------------------------------------------------------
     5. DISTRIBUTION BARS
     Animates width from 0 to data-width value when the
     element enters the viewport.
  -------------------------------------------------------- */
  function initDistributionBars() {
    const bars = document.querySelectorAll('.dist-bar[data-width]');
    if (!bars.length) return;

    // Set initial state
    bars.forEach(bar => {
      bar.style.width = '0%';
      bar.style.transition = 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)';
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const bar = entry.target;
        const target = bar.dataset.width;
        // Delay slightly so the user sees the animation start
        setTimeout(() => {
          bar.style.width = target + '%';
        }, 100);
        observer.unobserve(bar);
      });
    }, { threshold: 0.2 });

    bars.forEach(bar => observer.observe(bar));
  }


  /* --------------------------------------------------------
     6. TIMELINE PULSE
     The .timeline-pulse class gets a CSS keyframe animation
     injected at runtime so the "in progress" milestone
     shows a pulsing ring effect.
  -------------------------------------------------------- */
  function initTimelinePulse() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes timelinePulse {
        0%   { box-shadow: 0 0 0 0   rgba(2, 59, 253, 0.55); transform: scale(1); }
        50%  { box-shadow: 0 0 0 8px rgba(2, 59, 253, 0);    transform: scale(1.1); }
        100% { box-shadow: 0 0 0 0   rgba(2, 59, 253, 0);    transform: scale(1); }
      }
      .timeline-pulse {
        animation: timelinePulse 1.8s ease-out infinite;
      }
    `;
    document.head.appendChild(style);
  }


  /* --------------------------------------------------------
     INIT — Run everything on DOMContentLoaded
  -------------------------------------------------------- */
  function init() {
    initScrollReveal();
    initCountUp();
    initScrollProgress();
    initGanttBars();
    initDistributionBars();
    initTimelinePulse();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
