/* ============================================================
   nav-builder.js
   Auto-generates the left sidebar nav from the <section> elements
   inside <main>. Add a new <section id="..."> with an <h2> and a
   nav link appears automatically — no need to hand-edit the menu
   on every project page.

   Optional: add a "Home" / "All projects" link by placing
   <ul id="sidebar-links"> ... static <li> items ... </ul>
   in the HTML — anything already in the list is kept, and the
   auto-generated section links are appended after it.
   ============================================================ */

// Sections are now injected dynamically by render-project.js, so we build the
// nav once that script dispatches "sections-ready" rather than on page load.
document.addEventListener('sections-ready', () => {
    const sidebar = document.getElementById('sidebar');
    const list = document.getElementById('sidebar-links');
    const header = document.querySelector('header');
    const hamburger = document.querySelector('.hamburger');

    if (!sidebar || !list) return;

    // 1) Auto-build links from every top-level <section> with an id + heading
    const sections = document.querySelectorAll('main section.section[id]');
    const seen = new Set();

    sections.forEach((section) => {
        const id = section.getAttribute('id');
        if (!id || seen.has(id)) return;
        seen.add(id);

        const heading = section.querySelector('h2');
        const label = heading ? heading.textContent.trim() : id;

        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = label;
        li.appendChild(a);
        list.appendChild(li);
    });

    // 2) Hamburger toggle (mobile off-canvas sidebar)
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('nav-open');
            hamburger.classList.toggle('open', isOpen);
            document.body.classList.toggle('nav-open', isOpen);
        });
    }

    // Close the sidebar when a link is tapped (mobile) or the overlay is clicked
    const closeNav = () => {
        sidebar.classList.remove('nav-open');
        document.body.classList.remove('nav-open');
        if (hamburger) hamburger.classList.remove('open');
    };

    sidebar.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') closeNav();
    });

    const overlay = document.querySelector('.nav-overlay');
    if (overlay) overlay.addEventListener('click', closeNav);

    // 3) Highlight the active section link while scrolling
    const navLinks = sidebar.querySelectorAll('a[href^="#"]');
    const observed = Array.from(navLinks)
        .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
        .filter(Boolean);

    if ('IntersectionObserver' in window && observed.length) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        navLinks.forEach((link) => link.classList.remove('active'));
                        const active = sidebar.querySelector(`a[href="#${entry.target.id}"]`);
                        if (active) active.classList.add('active');
                    }
                });
            },
            { rootMargin: '-45% 0px -50% 0px' }
        );
        observed.forEach((section) => observer.observe(section));
    }
});