/* ============================================================
   include-partials.js
   Loads shared HTML fragments (e.g. the footer) into any element
   with a [data-include] attribute, so you edit that fragment once
   in /partials/ and every project page picks up the change.

   Usage in a page:
     <footer data-include="/partials/footer.html"></footer>

   Note: this relies on fetch(), which requires the page to be
   served over http(s) — this works fine on GitHub Pages, but NOT
   if you just double-click the HTML file locally. For local
   testing, run a simple local server, e.g.:
     python3 -m http.server
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const includeTargets = document.querySelectorAll('[data-include]');

    includeTargets.forEach(async (el) => {
        const path = el.getAttribute('data-include');
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
            el.innerHTML = await response.text();
        } catch (err) {
            console.error(err);
        }
    });
});
