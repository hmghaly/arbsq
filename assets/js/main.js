/** Named HTML handler for the landing-page directory. */
function filter_tools(tag) {
    const buttons = document.querySelectorAll('[data-filter]');
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === tag));
    let available = 0;
    let upcoming = 0;
    for (const tool of document.querySelectorAll('[data-tool]')) {
        const matches = tag === 'all' || tool.dataset.tags.split(',').includes(tag);
        tool.hidden = !matches;
        if (matches && tool.dataset.tool === 'available') available++;
        if (matches && tool.dataset.tool === 'upcoming') upcoming++;
    }
    document.getElementById('tool-result-count').textContent = `${available} ${available === 1 ? 'tool' : 'tools'} available`;
    document.getElementById('tool-empty').hidden = available !== 0;
    document.getElementById('upcoming-count').textContent = `${upcoming} ${upcoming === 1 ? 'tool' : 'tools'}`;
    const details = document.getElementById('upcoming-tools');
    details.hidden = upcoming === 0;
    details.open = tag !== 'all' && upcoming > 0;
}

function initialize_home() {
    document.getElementById('copyright').textContent = `© ${new Date().getFullYear()} ARBSQ. All rights reserved.`;
}

initialize_home();
