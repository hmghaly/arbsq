import { LANGUAGES, MODELS, MAX_TEXT_BYTES, SAMPLE_TEXT, direction, cellId, exportTranslation, exportFilename, sampleResources } from './xl8-text.js';
import { createProject, projectStore } from './xl8-projects.js';

const $ = id => document.getElementById(id);
const errorBox = $('error');
function showError(error) {
    errorBox.textContent = error.message || String(error);
    errorBox.hidden = false;
    const dialog = document.querySelector('dialog[open]');
    if (dialog) {
        let message = dialog.querySelector('.dialog-error');
        if (!message) {
            message = element('p', undefined, 'message error dialog-error');
            message.setAttribute('role', 'alert');
            dialog.prepend(message);
        }
        message.textContent = errorBox.textContent;
        message.scrollIntoView({ block: 'nearest' });
    } else errorBox.scrollIntoView({ block: 'nearest' });
}
function clearError() {
    errorBox.hidden = true; errorBox.textContent = '';
    document.querySelectorAll('.dialog-error').forEach(message => message.remove());
}
function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}
function button(text, action, className = 'button') {
    const node = element('button', text, className);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
}
function setLanguage(node, language) { node.lang = language; node.dir = direction(language); }
let store;
try { store = projectStore(window.localStorage); }
catch { showError(new Error('Browser storage is unavailable. Allow site storage to open or save projects.')); }

if (document.body.dataset.page === 'input') setupInput();
if (document.body.dataset.page === 'dashboard') setupDashboard();
if (document.body.dataset.page === 'editor') setupEditor();

function setupInput() {
    let method = 'paste';
    for (const id of ['source-language', 'target-language']) {
        for (const [value, name] of Object.entries(LANGUAGES)) $(id).add(new Option(name, value));
    }
    $('source-language').value = 'en';
    $('target-language').value = 'ar';
    MODELS.forEach(model => $('model').add(new Option(model, model)));
    function changeTab(next, focus = false) {
        method = next;
        for (const value of ['paste', 'file']) {
            const selected = value === method;
            $(value + '-tab').setAttribute('aria-selected', String(selected));
            $(value + '-tab').tabIndex = selected ? 0 : -1;
            $(value + '-panel').hidden = !selected;
        }
        if (focus) $(next + '-tab').focus();
    }
    for (const name of ['paste', 'file']) {
        $(name + '-tab').addEventListener('click', () => changeTab(name));
        $(name + '-tab').addEventListener('keydown', event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                changeTab(event.key === 'Home' ? 'paste' : event.key === 'End' ? 'file' : method === 'paste' ? 'file' : 'paste', true);
            }
        });
    }
    $('source-language').addEventListener('change', () => setLanguage($('source-text'), $('source-language').value));
    $('source-file').addEventListener('change', () => {
        const file = $('source-file').files[0];
        $('file-status').textContent = file ? `${file.name} · ${Math.ceil(file.size / 1024)} KB` : 'No file selected.';
    });
    $('load-sample').addEventListener('click', () => {
        changeTab('paste');
        $('source-text').value = SAMPLE_TEXT;
        $('source-language').value = 'en';
        $('target-language').value = 'ar';
        setLanguage($('source-text'), 'en');
        $('source-text').focus();
    });
    $('project-form').addEventListener('submit', async event => {
        event.preventDefault();
        clearError();
        $('create-project').disabled = true;
        try {
            if (!store) throw new Error('Browser storage is unavailable. Allow site storage before creating a project.');
            let text = $('source-text').value;
            let documentName = 'Pasted text';
            if (method === 'file') {
                const file = $('source-file').files[0];
                if (!file) throw new Error('Choose a TXT file to import.');
                if (!/\.txt$/i.test(file.name)) throw new Error('Choose a .txt document. Word and PDF files are not supported.');
                if (file.size > MAX_TEXT_BYTES) throw new Error('This file is larger than 1 MB. Import a smaller text document.');
                try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
                catch { throw new Error('This file could not be read as UTF-8 text. Save it with UTF-8 encoding and try again.'); }
                documentName = file.name;
            }
            if (!text.trim()) throw new Error('Add some source text before creating a project.');
            if (new TextEncoder().encode(text).length > MAX_TEXT_BYTES) throw new Error('Source text is larger than 1 MB. Use a smaller document.');
            const project = createProject({ name: $('project-name').value, documentName, text,
                sourceLanguage: $('source-language').value, targetLanguage: $('target-language').value,
                model: $('model').value, prompt: $('prompt').value });
            store.save(project);
            location.href = `editor.html?project=${encodeURIComponent(project.id)}`;
        } catch (error) { showError(error); }
        finally { $('create-project').disabled = false; }
    });
}

function setupDashboard() {
    if (!store) return;
    try {
        const projects = store.list();
        if (!projects.length) {
            const empty = element('div', undefined, 'empty-state');
            empty.append(element('h2', 'Your next translation starts here'), element('p', 'Add source text or a TXT document to create your first project.'));
            const link = element('a', 'New translation', 'button primary'); link.href = 'index.html'; empty.append(link);
            $('project-list').append(empty);
            return;
        }
        const scroll = element('div', undefined, 'table-scroll');
        const table = element('table', undefined, 'project-table');
        const caption = element('caption', 'Projects saved in this browser', 'sr-only');
        const header = element('tr');
        ['Project / document', 'Languages', 'Progress', 'Updated', ''].forEach(label => {
            const th = element('th', label); th.scope = 'col'; header.append(th);
        });
        const thead = element('thead'); thead.append(header);
        const tbody = element('tbody');
        for (const project of projects) {
            const doc = project.documents[0];
            const tr = element('tr');
            const name = element('td'); name.append(element('strong', project.name), element('small', doc.name));
            const languages = element('td', `${LANGUAGES[project.sourceLanguage]} → ${LANGUAGES[project.targetLanguage]}`);
            const progress = element('td', `${doc.segments.filter(segment => segment.target.trim()).length} / ${doc.segments.length}`);
            const updated = element('td'); const time = element('time', new Date(project.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })); time.dateTime = project.updatedAt; updated.append(time);
            const action = element('td'); const link = element('a', 'Open', 'button'); link.href = `editor.html?project=${encodeURIComponent(project.id)}`; link.setAttribute('aria-label', `Open ${project.name}`); action.append(link);
            tr.append(name, languages, progress, updated, action); tbody.append(tr);
        }
        table.append(caption, thead, tbody); scroll.append(table); $('project-list').append(scroll);
    } catch (error) { showError(error); }
}

function setupEditor() {
    if (!store) return;
    let project;
    try { project = store.load(new URLSearchParams(location.search).get('project')); }
    catch (error) { showError(error); return; }
    if (!project) { $('missing-project').hidden = false; return; }
    const doc = () => project.documents[0];
    let activeId = null;
    let draft = '';
    let inlineEditor = null;
    let modalSnapshot = '';
    let pendingResolve = null;
    const rowNodes = new Map();
    const segment = () => doc().segments.find(item => item.id === activeId);
    const isDirty = () => !!segment() && draft !== segment().target;
    $('workspace').hidden = false;
    $('project-label').textContent = project.name;
    $('document-title').textContent = doc().name;
    document.title = `${project.name} | XL8 · ARBSQ`;
    $('saved-model').textContent = project.model;
    $('saved-prompt').textContent = project.prompt || 'No additional prompt';
    $('language-pair').textContent = `${LANGUAGES[project.sourceLanguage]} → ${LANGUAGES[project.targetLanguage]}`;
    $('source-heading').textContent = `Source · ${LANGUAGES[project.sourceLanguage]}`;
    $('target-heading').textContent = `Target · ${LANGUAGES[project.targetLanguage]}`;
    function updateProgress() { $('progress').textContent = `${doc().segments.filter(item => item.target.trim()).length} of ${doc().segments.length} translated`; }
    function updateDraft(value) { draft = value; $('save-status').textContent = isDirty() ? 'Unapplied changes' : 'Saved in this browser'; }
    function saveDraft() {
        if (!segment() || !isDirty()) return true;
        const next = structuredClone(project);
        next.documents[0].segments.find(item => item.id === activeId).target = draft;
        next.updatedAt = new Date().toISOString();
        try { store.save(next); project = next; clearError(); $('save-status').textContent = 'Saved in this browser'; updateProgress(); return true; }
        catch (error) { showError(error); $('save-status').textContent = 'Not saved · apply to retry'; return false; }
    }
    function finishPending(result) {
        $('pending-dialog').close();
        const resolve = pendingResolve; pendingResolve = null;
        if (!result) inlineEditor?.focus();
        if (resolve) resolve(result);
    }
    function resolveDraft() {
        if (!isDirty()) return Promise.resolve(true);
        if (pendingResolve) return Promise.resolve(false);
        return new Promise(resolve => { pendingResolve = resolve; $('pending-dialog').showModal(); });
    }
    $('keep-editing').addEventListener('click', () => finishPending(false));
    $('discard-draft').addEventListener('click', () => { draft = segment().target; if (inlineEditor) inlineEditor.value = draft; $('save-status').textContent = 'Saved in this browser'; finishPending(true); });
    $('save-draft').addEventListener('click', () => { if (saveDraft()) finishPending(true); });
    $('pending-dialog').addEventListener('cancel', event => { event.preventDefault(); finishPending(false); });
    function restoreTarget(id) {
        const item = doc().segments.find(entry => entry.id === id);
        const nodes = rowNodes.get(id);
        nodes.row.classList.remove('active');
        nodes.target.replaceChildren();
        const targetButton = button(item.target || 'Select to translate', () => selectSegment(id), 'cell-text');
        setLanguage(targetButton, project.targetLanguage);
        if (!item.target) targetButton.classList.add('target-placeholder');
        targetButton.setAttribute('aria-label', `Edit target segment ${nodes.number}`);
        targetButton.setAttribute('aria-description', item.target || 'No translation yet');
        nodes.target.append(targetButton);
    }
    async function selectSegment(id) {
        if (id === activeId) { inlineEditor?.focus(); return; }
        if (!await resolveDraft()) return;
        if (activeId) restoreTarget(activeId);
        activeId = id; draft = segment().target;
        const nodes = rowNodes.get(id); nodes.row.classList.add('active');
        const wrapper = element('div', undefined, 'inline-editor');
        wrapper.lang = 'en'; wrapper.dir = 'ltr';
        const menu = element('div', undefined, 'segment-menu');
        const more = button('Show more', openResources); more.setAttribute('aria-haspopup', 'dialog');
        const actions = element('div', undefined, 'edit-actions');
        actions.append(button('Cancel', () => { draft = segment().target; $('save-status').textContent = 'Saved in this browser'; const previous = activeId; restoreTarget(previous); activeId = null; inlineEditor = null; rowNodes.get(previous).target.querySelector('button').focus(); }),
            button('Apply', () => { if (saveDraft()) { const previous = activeId; restoreTarget(previous); activeId = null; inlineEditor = null; rowNodes.get(previous).target.querySelector('button').focus(); } }, 'button primary'));
        menu.append(more, actions);
        inlineEditor = element('textarea'); inlineEditor.id = `edit-${activeId}`; inlineEditor.value = draft; setLanguage(inlineEditor, project.targetLanguage);
        inlineEditor.addEventListener('input', () => updateDraft(inlineEditor.value));
        const label = element('label', `Target translation · segment ${nodes.number}`); label.htmlFor = inlineEditor.id;
        wrapper.append(menu, label, inlineEditor); nodes.target.replaceChildren(wrapper); inlineEditor.focus();
    }
    for (const [index, item] of doc().segments.entries()) {
        const row = element('tr'); row.dataset.segmentId = item.id;
        const number = element('td', String(index + 1), 'segment-number');
        const source = element('td'); source.id = cellId(doc().id, item.id, 'source'); source.dataset.segmentId = item.id; setLanguage(source, project.sourceLanguage);
        const sourceButton = button(item.source, () => selectSegment(item.id), 'cell-text'); sourceButton.setAttribute('aria-label', `Edit translation for source segment ${index + 1}`); sourceButton.setAttribute('aria-description', item.source); source.append(sourceButton);
        const target = element('td', undefined, 'xl8-target'); target.id = cellId(doc().id, item.id, 'target'); target.dataset.segmentId = item.id; target.dataset.sourceId = source.id; setLanguage(target, project.targetLanguage);
        row.append(number, source, target); $('segments').append(row);
        rowNodes.set(item.id, { row, source, target, number: index + 1 }); restoreTarget(item.id);
    }
    updateProgress();
    function openResources() {
        modalSnapshot = draft;
        $('modal-source').textContent = segment().source; setLanguage($('modal-source'), project.sourceLanguage);
        $('modal-target').value = draft; setLanguage($('modal-target'), project.targetLanguage);
        $('segment-dialog-title').textContent = `Segment ${rowNodes.get(activeId).number} · translation options`;
        const resources = sampleResources(segment().source, project.sourceLanguage, project.targetLanguage);
        $('suggestions').replaceChildren(); $('terms').replaceChildren();
        if (!resources.suggestions.length) $('suggestions').append(element('p', 'No suggestions for this sentence yet. You can write your translation above.', 'help'));
        resources.suggestions.forEach((suggestion, index) => {
            const card = element('div', undefined, 'suggestion'); const text = element('p', suggestion); setLanguage(text, project.targetLanguage);
            card.append(text, button(`Use sample ${index + 1}`, () => { $('modal-target').value = suggestion; syncModalDraft(); $('modal-target').focus(); })); $('suggestions').append(card);
        });
        if (!resources.terms.length) $('terms').append(element('p', 'No terminology available for this sentence.', 'help'));
        resources.terms.forEach(([source, target]) => {
            const pair = element('div', undefined, 'term-pair'); const sourceTerm = element('span', source); const targetTerm = element('span', target);
            setLanguage(sourceTerm, project.sourceLanguage); setLanguage(targetTerm, project.targetLanguage); pair.append(sourceTerm, targetTerm); $('terms').append(pair);
        });
        $('segment-dialog').showModal();
    }
    function syncModalDraft() { updateDraft($('modal-target').value); inlineEditor.value = draft; }
    function cancelResources() { updateDraft(modalSnapshot); inlineEditor.value = draft; $('segment-dialog').close(); inlineEditor.focus(); }
    $('modal-target').addEventListener('input', syncModalDraft);
    $('close-resources').addEventListener('click', cancelResources);
    $('cancel-resources').addEventListener('click', cancelResources);
    $('segment-dialog').addEventListener('cancel', event => { event.preventDefault(); cancelResources(); });
    $('apply-resources').addEventListener('click', () => { if (saveDraft()) { $('segment-dialog').close(); inlineEditor.focus(); } });
    function download() {
        const blob = new Blob([exportTranslation(doc().segments)], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob); const link = element('a'); link.href = url; link.download = exportFilename(doc().name === 'Pasted text' ? project.name : doc().name);
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    $('export').addEventListener('click', async () => {
        if (!await resolveDraft()) return;
        const missing = doc().segments.filter(item => !item.target.trim()).length;
        if (missing) { $('export-warning').textContent = `${missing} of ${doc().segments.length} segments have no translation. Their text will be empty in the exported file.`; $('export-dialog').showModal(); }
        else download();
    });
    $('cancel-export').addEventListener('click', () => $('export-dialog').close());
    $('confirm-export').addEventListener('click', () => { $('export-dialog').close(); download(); });
    document.addEventListener('click', async event => {
        const link = event.target.closest('a[href]');
        if (!link) return;
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !isDirty()) return;
        event.preventDefault(); if (await resolveDraft()) location.href = link.href;
    });
    window.addEventListener('beforeunload', event => { if (isDirty()) { event.preventDefault(); event.returnValue = ''; } });
}
