/** Shared ARBSQ navigation. Paths include the host's Pages subpath. */
var arbsq_navigation = {};

function navigation_element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function navigation_link(text, path) {
    const node = navigation_element('a', text);
    node.href = arbsq_navigation.root + path;
    node.setAttribute('onclick', 'return navigate_site_link(this, event)');
    return node;
}

function navigate_site_link(link, event) {
    const allowed = typeof window.navigate_to === 'function' ? window.navigate_to(link, event) : true;
    if (allowed) close_navigation();
    return allowed;
}

function mark_current_section() {
    if (arbsq_navigation.tool) return;
    arbsq_navigation.summary.classList.toggle('arbsq-active', location.hash === '#tools');
    for (const item of arbsq_navigation.nav.querySelectorAll('a')) {
        if (location.hash && new URL(item.href).hash === location.hash) item.setAttribute('aria-current', 'location');
        else item.removeAttribute('aria-current');
    }
}

function close_navigation() {
    arbsq_navigation.tools.open = false;
    arbsq_navigation.nav.classList.remove('arbsq-expanded');
    arbsq_navigation.toggle.setAttribute('aria-expanded', 'false');
}

function toggle_navigation() {
    const expanded = arbsq_navigation.toggle.getAttribute('aria-expanded') !== 'true';
    arbsq_navigation.toggle.setAttribute('aria-expanded', String(expanded));
    arbsq_navigation.nav.classList.toggle('arbsq-expanded', expanded);
    if (!expanded) arbsq_navigation.tools.open = false;
}

function site_page_click(event) {
    if (!arbsq_navigation.header.contains(event.target)) close_navigation();
}

function navigation_key(event) {
    if (event.key !== 'Escape') return;
    if (arbsq_navigation.tools.open) {
        arbsq_navigation.tools.open = false; arbsq_navigation.summary.focus();
    } else if (arbsq_navigation.nav.classList.contains('arbsq-expanded')) {
        close_navigation(); arbsq_navigation.toggle.focus();
    }
}

function initialize_navigation() {
    const header = document.querySelector('[data-arbsq-nav]');
    if (!header) return;
    arbsq_navigation.header = header;
    arbsq_navigation.root = header.dataset.root || './';
    arbsq_navigation.tool = header.dataset.tool;
    const inner = navigation_element('div', null, 'arbsq-header-inner');
    const brand = navigation_link('', 'index.html'); brand.className = 'arbsq-brand';
    brand.setAttribute('aria-label', 'ARBSQ home');
    const logo = navigation_element('img'); logo.src = arbsq_navigation.root + 'assets/images/logo.png'; logo.alt = '';
    brand.append(logo, navigation_element('span', 'ARBSQ'));
    const toggle = navigation_element('button', 'Menu', 'arbsq-menu-toggle'); toggle.type = 'button';
    toggle.setAttribute('onclick', 'toggle_navigation()');
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'arbsq-main-nav');
    const nav = navigation_element('nav', null, 'arbsq-main-nav'); nav.id = 'arbsq-main-nav'; nav.setAttribute('aria-label', 'Main navigation');
    const tools = navigation_element('details', null, 'arbsq-tools');
    const summary = navigation_element('summary', 'Tools');
    if (arbsq_navigation.tool) summary.classList.add('arbsq-active');
    const menu = navigation_element('div', null, 'arbsq-tools-list');
    for (const [text, path, name] of [
        ['XL8 translation', 'projects/xl8/dashboard.html', 'xl8'],
        ['Canvas alignment', 'projects/canvas/', 'canvas'],
        ['Country names', 'cs/', 'countries'],
        ['All tools', 'index.html#tools', null]
    ]) {
        const item = navigation_link(text, path);
        if (arbsq_navigation.tool && name === arbsq_navigation.tool) item.setAttribute('aria-current', 'location');
        menu.append(item);
    }
    tools.append(summary, menu);
    nav.append(tools, navigation_link('Research', 'index.html#research'), navigation_link('Tutorials', 'index.html#tutorials'));
    inner.append(brand, toggle, nav); header.replaceChildren(inner);
    Object.assign(arbsq_navigation, { toggle, nav, tools, summary });
    header.setAttribute('onkeydown', 'navigation_key(event)');
    document.body.setAttribute('onclick', 'site_page_click(event)');
    document.body.setAttribute('onhashchange', 'mark_current_section()');
    // Named property handler also resets menus when crossing the mobile breakpoint.
    arbsq_navigation.breakpoint = matchMedia('(max-width: 640px)');
    arbsq_navigation.breakpoint.onchange = close_navigation;
    mark_current_section();
}

initialize_navigation();
