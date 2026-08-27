/* ============================================================
   include-partials.js
   Loads shared HTML fragments (e.g. the footer) into any element
   with a [data-include] attribute, so you edit that fragment once
   in /partials/ and every project page picks up the change.

   Usage in a page:
     <footer data-include="partials/footer.html"></footer>

   Path handling: write data-include as a path relative to the site
   root (no leading "/", no "../"). This script resolves it based on
   where THIS FILE lives (always "<site-root>/js/include-partials.js"),
   not where the current page lives — so it works the same whether
   the page is at the site root or nested several folders deep.

   Note: this relies on fetch(), which requires the page to be
   served over http(s) — this works fine on GitHub Pages and on
   VS Code's Live Server, but NOT if you just double-click the HTML
   file locally (file://). For local testing without an extension,
   run a simple local server from the site root, e.g.:
     python3 -m http.server
   ============================================================ */

(function () {
    // This script always lives at <site-root>/js/include-partials.js.
    const SITE_ROOT = new URL('../', document.currentScript.src);

    function resolvePath(path) {
        if (!path) return path;
        if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(path) || path.startsWith('data:')) {
            return path; // already a full URL
        }
        return new URL(path.replace(/^\/+/, ''), SITE_ROOT).href;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const includeTargets = document.querySelectorAll('[data-include]');

        includeTargets.forEach(async (el) => {
            const path = el.getAttribute('data-include');
            const url = resolvePath(path);
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to load ${path} (${url}): ${response.status}`);
                el.innerHTML = await response.text();
            } catch (err) {
                console.error(err);
            }
        });
    });
})();
