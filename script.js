/* ════════════════════════════════════════════════════════════════
   CYBER-ANALOG SPA ROUTER — script.js
   Hash-based routing for the SPA:
   - #/home       → Home
   - #/projects   → Projects Directory
   - #/project-1  → Project 1 (4 Step Sequencer)
   - #/project-2  → Project 2 (myOS Kernel)
   - #/project-3  → Project 3 (APP-01 Placeholder)
   - #/lab        → Lab / About
   - anything else → 404 view ("Signal lost")

   Also handles: theme toggle (dark / light, localStorage-persisted)
   loading screen (bench boot sequence, fades on window.load)
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── DOM references ─────────────────────────────────────────── */
  const DEFAULT_VIEW = 'home';
  const NOT_FOUND_VIEW = '404';

  function getViews() {
    return document.querySelectorAll('[data-view]');
  }

  /* ─── Route table ────────────────────────────────────────────── */
  // Maps a hash path (without the leading '#') to a view id.
  const ROUTES = {
    'home': 'home',
    'projects': 'projects',
    'project-1': 'project-1',
    'project-2': 'project-2',
    'project-3': 'project-3',
    'lab': 'lab'
  };

  /* ─── Helpers ────────────────────────────────────────────────── */

  /**
   * Read the current hash and normalize it to a route key.
   * Returns '/home' for empty or '#'.
   */
  function getCurrentRoute() {
    const hash = window.location.hash.replace(/^#/, '');
    const path = hash.split('?')[0].split('#')[0]; // strip any query part
    const cleaned = path.replace(/^\/+/, '').replace(/\/+$/, '').trim();
    return cleaned === '' ? 'home' : cleaned.toLowerCase();
  }

  /**
   * Pause every audio element on the page. Called on view changes so
   * music stops when the user navigates away from a project.
   */
  function pauseAllAudio() {
    document.querySelectorAll('audio').forEach((audio) => {
      audio.pause();
    });
  }

  /**
   * Hide every view section, then show the one matching the target id.
   * Unknown targets fall back to the 404 view instead of failing silently.
   * Re-triggers the CSS fade-in animation by removing/adding .active.
   */
  function showView(targetId) {
    // Resolve unknown targets to the 404 view
    const resolved = ROUTES[targetId] || NOT_FOUND_VIEW;
    const target = document.querySelector(`[data-view="${resolved}"]`);
    if (!target) {
      console.warn(`[router] No view element registered for data-view="${resolved}"`);
      return;
    }

    // Stop any playing audio before switching views
    pauseAllAudio();

    // Deactivate all views
    getViews().forEach((view) => {
      view.classList.remove('active');
    });

    // Force reflow so the animation restarts reliably on re-navigation
    void target.offsetWidth;

    // Activate the target with the fade-in animation class
    target.classList.add('active');

    // Jump to the top of the page on every view change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Navigate based on the current URL hash.
   * Unknown routes resolve to the 404 view.
   */
  function navigateFromHash() {
    const route = getCurrentRoute();
    // Direct hash → view id lookup, else 404
    showView(ROUTES[route] || '404');
  }

  /* ─── Event wiring ───────────────────────────────────────────── */

  /**
   * Delegate all clicks. Any element carrying a data-target attribute
   * (nav links, CTA buttons, project cards) triggers an in-app route.
   * Elements with a matching href="#/…" update the hash naturally;
   * the hashchange event then fires the router. Cards without an
   * anchor update the hash programmatically via data-route.
   */
  document.addEventListener('click', (event) => {
    // Ignore clicks on interactive media controls (audio players live
    // inside project cards, so we must not let them trigger navigation).
    if (event.target.closest('audio, .audio-player')) return;

    // External repo / link buttons inside cards must not trigger the router.
    if (event.target.closest('[data-repo]')) return;

    // Walk up from the clicked element to find an ancestor with data-target
    const trigger = event.target.closest('[data-target]');

    // No router trigger found — nothing to do
    if (!trigger) return;

    const target = trigger.getAttribute('data-target');

    // Internal SPA navigation only
    if (target) {
      event.preventDefault();

      // Always derive the hash from the target so the URL stays in sync
      // with the visible view. The hashchange listener then renders.
      const route = trigger.getAttribute('data-route') || `#/${target}`;
      if (window.location.hash !== route) {
        window.location.hash = route;
      } else {
        // Hash unchanged (e.g. re-clicking the same project after going
        // back) — render the view directly so it always re-opens.
        showView(target);
      }
    }
  });

  /**
   * Back / forward button support: re-read the hash and re-render.
   */
  window.addEventListener('hashchange', navigateFromHash);

  /* ─── Keyboard support for card elements ─────────────────────── */
  // Project cards are interactive <article role="button"> elements.
  // Enter / Space should trigger the same router navigation as a click.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const trigger = event.target.closest('[data-target][role="button"]');
    if (!trigger) return;

    event.preventDefault();

    const target = trigger.getAttribute('data-target');
    const route = trigger.getAttribute('data-route') || `#/${target}`;
    if (window.location.hash !== route) {
      window.location.hash = route;
    } else {
      showView(target);
    }
  });

  /* ─── Theme toggle (dark / light) ────────────────────────────── */

  const THEME_KEY = 'bench-theme';
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  /**
   * Apply the given theme to the document.
   * 'dark'  → no .light class on <html> (default)
   * 'light' → .light class on <html>
   */
  function applyTheme(theme) {
    const isLight = theme === 'light';
    document.documentElement.classList.toggle('light', isLight);

    // Swap the icon: moon shown in dark mode, sun shown in light mode
    if (themeIcon) {
      themeIcon.className = isLight ? 'ph ph-sun text-lg' : 'ph ph-moon text-lg';
    }
  }

  // Restore saved preference on load (defaults to dark)
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = document.documentElement.classList.contains('light');
      const next = isLight ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }
  
  /* ─── Initial render ─────────────────────────────────────────── */
  // Read the hash (if any) on first load and render the matching view.
  // Defaults to home when no hash is present.
  navigateFromHash();
})();
