/** Shared ARBSQ navigation. Paths are relative to each page, including Pages subpaths. */
(() => {
    const header = document.querySelector('[data-arbsq-nav]');
    if (!header) return;
    const root = header.dataset.root || './';
    const tool = header.dataset.tool;
    const make = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    };
    const link = (text, path) => {
        const node = make('a', text);
        node.href = root + path;
        return node;
    };
    const inner = make('div', null, 'arbsq-header-inner');
    const brand = link('', 'index.html'); brand.className = 'arbsq-brand';
    brand.setAttribute('aria-label', 'ARBSQ home');
    const logo = make('img'); logo.src = root + 'assets/images/logo.png'; logo.alt = '';
    brand.append(logo, make('span', 'ARBSQ'));
    const toggle = make('button', 'Menu', 'arbsq-menu-toggle'); toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'arbsq-main-nav');
    const nav = make('nav', null, 'arbsq-main-nav'); nav.id = 'arbsq-main-nav'; nav.setAttribute('aria-label', 'Main navigation');
    const tools = make('details', null, 'arbsq-tools');
    const summary = make('summary', 'Tools');
    if (tool) summary.classList.add('arbsq-active');
    const menu = make('div', null, 'arbsq-tools-list');
    const items = [
        ['XL8 translation', 'projects/xl8/dashboard.html', 'xl8'],
        ['Canvas alignment', 'projects/canvas/', 'canvas'],
        ['Country names', 'cs/', 'countries'],
        ['All tools', 'index.html#tools', null]
    ];
    for (const [text, path, name] of items) {
        const item = link(text, path);
        if (tool && name === tool) item.setAttribute('aria-current', 'location');
        menu.append(item);
    }
    tools.append(summary, menu);
    nav.append(tools, link('Research', 'index.html#research'), link('Tutorials', 'index.html#tutorials'));
    inner.append(brand, toggle, nav); header.replaceChildren(inner);
    function markCurrentSection() {
        if (tool) return;
        summary.classList.toggle('arbsq-active', location.hash === '#tools');
        nav.querySelectorAll('a').forEach(item => {
            if (location.hash && new URL(item.href).hash === location.hash) item.setAttribute('aria-current', 'location');
            else item.removeAttribute('aria-current');
        });
    }
    markCurrentSection();
    window.addEventListener('hashchange', markCurrentSection);
    function closeNavigation() {
        tools.open = false;
        nav.classList.remove('arbsq-expanded');
        toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        nav.classList.toggle('arbsq-expanded', expanded);
        if (!expanded) tools.open = false;
    });
    document.addEventListener('click', event => {
        if (!header.contains(event.target)) closeNavigation();
        // XL8 may prevent a link's default action while resolving an unapplied edit.
        // Leave its return-focus target visible until the action is resolved.
        if (header.contains(event.target) && event.target.closest('a')) {
            queueMicrotask(() => { if (!event.defaultPrevented) closeNavigation(); });
        }
    });
    header.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (tools.open) { tools.open = false; summary.focus(); }
        else if (nav.classList.contains('arbsq-expanded')) { closeNavigation(); toggle.focus(); }
    });
    // Crossing the mobile breakpoint should not leave an invisible expanded menu.
    matchMedia('(max-width: 640px)').addEventListener('change', closeNavigation);
})();
