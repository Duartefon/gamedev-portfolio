/* ============================================================
   render-project.js
   Reads a project's Markdown file (YAML frontmatter + Markdown
   body) and builds the whole page: hero, meta, links, and every
   section. This is the only file that needs to understand HTML —
   writing a new project means writing a new .md file, nothing else.

   Depends on (loaded via CDN in the page, before this script):
     - js-yaml   (parses the frontmatter block)
     - marked    (parses the Markdown body)
   Optional:
     - Prism     (syntax-highlights ```code fences)

   Frontmatter fields (all optional except title):
     title:      Project name -> <h1> in header (unless "logo" is set), <title>
     tagline:    One-liner    -> shown under the title/logo in the header
     logo:       path to a logo image -> used in the header instead of the
                   text title, if present (title is still used for <title>
                   and image alt text)
     heroImage:  path to the hero image/gif
     meta:       key/value map -> rendered as the meta info cards
                   meta:
                     Role: Lead Developer
                     Engine/Tools: Java and Processing
     links:      list of {label, url} -> hero action buttons
                   links:
                     - label: View Source
                       url: https://github.com/...

   Body: plain Markdown. Every "## Heading" becomes its own
   <section id="slug-of-heading" class="section">. Sub-headings
   inside a section should use ### (not ##).

   Directives (fenced with ::: on their own line) let a section
   include the richer layout pieces from the original design:

     :::collapsible Diagram Title
     Markdown content, shown/hidden behind a toggle.
     :::

     :::features
     - title: Physics Simulation
       description: RigidBody and collision system
     - title: Boids
       description: Seek and wander behaviours
     :::

     :::gallery
     - src: screenshot1.jpg
       alt: Gameplay screenshot 1
     - src: screenshot2.jpg
       alt: Gameplay screenshot 2
     :::

   ── Path handling ───────────────────────────────────────────
   Every internal path (data-source on #project-root, heroImage,
   logo, gallery/feature image paths, and any ![](...) image in
   the Markdown body) should be written *relative to the site
   root*, with no leading "/" and no "../" — e.g. "images/zm/hero.png",
   "projects/markdown/space-game.md".

   This script resolves those paths itself, based on where THIS
   FILE lives (which is fixed: always at "<site-root>/js/render-project.js"),
   not based on where the current page lives. That means a page can
   be nested at any depth — /space-game.html or /projects/html/space-game.html —
   and the same site-root-relative paths in its Markdown work unchanged,
   with no per-page "../" counting.

   External paths (http://, https://, // or data:) are left untouched.
   ============================================================ */

(function () {
    const root = document.getElementById('project-root');
    if (!root) return;

    // This script always lives at <site-root>/js/render-project.js, so its
    // own location tells us exactly where the site root is — regardless of
    // how deeply the current PAGE is nested.
    const SITE_ROOT = new URL('../', document.currentScript.src);

    function resolvePath(path) {
        if (!path) return path;
        if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(path) || path.startsWith('data:')) {
            return path; // already a full URL (http://, https://, //cdn...) or a data URI
        }
        return new URL(path.replace(/^\/+/, ''), SITE_ROOT).href;
    }

    const src = root.getAttribute('data-source');
    if (!src) {
        console.error('render-project.js: #project-root is missing a data-source attribute.');
        return;
    }

    let collapsibleCounter = 0;

    fetch(resolvePath(src))
        .then((response) => {
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return response.text();
        })
        .then((raw) => {
            const { frontmatter, body } = splitFrontmatter(raw);
            root.innerHTML = '';
            renderHero(frontmatter);
            renderSections(body);
            resolveImagePaths(root);
            if (window.Prism) window.Prism.highlightAll();
            // Tell nav-builder.js (and anything else) the content now exists.
            document.dispatchEvent(new CustomEvent('sections-ready'));
        })
        .catch((err) => {
            console.error('Failed to load project content:', err);
            root.innerHTML = `<p class="loading-note">Couldn't load this project's content (${escapeHtml(src)} → ${escapeHtml(resolvePath(src))}). ${escapeHtml(err.message)}</p>`;
        });

    // ── Frontmatter + body split ──────────────────────────────
    function splitFrontmatter(raw) {
        const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
        if (!match) return { frontmatter: {}, body: raw };
        const frontmatter = (window.jsyaml && jsyaml.load(match[1])) || {};
        return { frontmatter, body: match[2] };
    }

    // ── Hero: header logo + meta card + links ─────────────────
    function renderHero(fm) {
        const logoSlot = document.getElementById('logo-slot');
        if (logoSlot) {
            const titleHtml = fm.logo
                ? `<img src="${escapeAttr(resolvePath(fm.logo))}" alt="${escapeAttr(fm.title || '')} logo">`
                : `<h1>${escapeHtml(fm.title || 'Untitled project')}</h1>`;
            logoSlot.innerHTML = `
                <div>
                    ${titleHtml}
                    ${fm.tagline ? `<p>${escapeHtml(fm.tagline)}</p>` : ''}
                </div>`;
        }
        if (fm.title) document.title = `${fm.title} | Duarte's Game Dev Portfolio`;

        const metaHtml = fm.meta
            ? Object.entries(fm.meta)
                  .map(
                      ([label, value]) => `
                <div class="meta-item">
                    <h3>${escapeHtml(label)}</h3>
                    <p>${escapeHtml(String(value))}</p>
                </div>`
                  )
                  .join('')
            : '';

        const linksHtml = Array.isArray(fm.links)
            ? fm.links
                  .map((l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`)
                  .join('')
            : '';

        const heroImageHtml = fm.heroImage
            ? `<div class="project-hero-image"><img src="${escapeAttr(resolvePath(fm.heroImage))}" alt="${escapeAttr(fm.title || '')} screenshot"></div>`
            : '';

        if (!metaHtml && !linksHtml && !heroImageHtml) return; // nothing to show, skip the hero block

        root.insertAdjacentHTML(
            'beforeend',
            `<section class="project-hero">
                ${heroImageHtml}
                <div class="project-hero-details">
                    ${metaHtml ? `<div class="project-meta">${metaHtml}</div>` : ''}
                    ${linksHtml ? `<div class="project-links">${linksHtml}</div>` : ''}
                </div>
            </section>`
        );
    }

    // ── Body: split into ## sections, render each ─────────────
    function renderSections(body) {
        const parts = body.split(/^##[ \t]+(.+)$/m).slice(1); // [heading, content, heading, content, ...]
        let html = '';
        for (let i = 0; i < parts.length; i += 2) {
            const heading = parts[i].trim();
            const content = parts[i + 1] || '';
            html += renderSection(heading, content);
        }
        root.insertAdjacentHTML('beforeend', html);
    }

    function renderSection(heading, rawContent) {
        const id = slugify(heading);
        const directives = [];
        const withPlaceholders = extractDirectives(rawContent, directives);

        let html = marked.parse(withPlaceholders);
        html = centerStandaloneImages(html);

        directives.forEach((renderedHtml, idx) => {
            const placeholder = new RegExp(`(<p>)?@@DIRECTIVE_${idx}@@(</p>)?`);
            html = html.replace(placeholder, renderedHtml);
        });

        return `<section id="${id}" class="section"><h2>${escapeHtml(heading)}</h2>${html}</section>`;
    }

    // ── Directives: :::type arg \n ... \n ::: ──────────────────
    function extractDirectives(md, directives) {
        return md.replace(/^:::(\w+)(?:[ \t]+(.*))?\n([\s\S]*?)\n:::[ \t]*$/gm, (match, type, arg, inner) => {
            const idx = directives.length;
            directives.push(renderDirective(type, (arg || '').trim(), inner));
            return `@@DIRECTIVE_${idx}@@`;
        });
    }

    function renderDirective(type, arg, inner) {
        switch (type) {
            case 'collapsible':
                return renderCollapsible(arg, inner);
            case 'features':
                return renderFeatures(inner);
            case 'gallery':
                return renderGallery(inner);
            default:
                console.warn(`render-project.js: unknown directive ":::${type}"`);
                return '';
        }
    }

    function renderCollapsible(label, inner) {
        const toggleId = `collapsible-toggle_${collapsibleCounter++}`;
        const innerHtml = centerStandaloneImages(marked.parse(inner.trim()));
        return `<input type="checkbox" id="${toggleId}" class="collapsible-toggle">
            <label for="${toggleId}" class="collapsible-btn">${escapeHtml(label || 'Details')}</label>
            <div class="collapsible-content"><div class="content-inner">${innerHtml}</div></div>`;
    }

    function renderFeatures(inner) {
        const items = (window.jsyaml && jsyaml.load(inner)) || [];
        const cards = items
            .map(
                (f) => `<div class="feature-card">
                    <h3>${escapeHtml(f.title || '')}</h3>
                    <p>${escapeHtml(f.description || '')}</p>
                </div>`
            )
            .join('');
        return `<div class="features-list">${cards}</div>`;
    }

    function renderGallery(inner) {
        const items = (window.jsyaml && jsyaml.load(inner)) || [];
        const shots = items
            .map((g) => `<div class="gallery-item"><img src="${escapeAttr(resolvePath(g.src))}" alt="${escapeAttr(g.alt || '')}"></div>`)
            .join('');
        return `<div class="gallery">${shots}</div>`;
    }

    // ── Small helpers ───────────────────────────────────────────
    function centerStandaloneImages(html) {
        // A paragraph containing only a single <img> gets the centered treatment
        return html.replace(/<p>(\s*<img[^>]+>\s*)<\/p>/g, '<div class="center-img">$1</div>');
    }

    // Markdown ![](path) images (and any raw <img> in the body) are written
    // by marked.js as literal <img src="..."> — rewrite those src attributes
    // to be resolved against the site root too, same as heroImage/logo/gallery.
    function resolveImagePaths(container) {
        container.querySelectorAll('img[src]').forEach((img) => {
            img.setAttribute('src', resolvePath(img.getAttribute('src')));
        });
    }

    function slugify(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, '&quot;');
    }
})();
