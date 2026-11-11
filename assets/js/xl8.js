import { LANGUAGES, MODELS, SAMPLE_TEXT, direction, exportTranslation, exportFilename, sampleResources, split_text, normalize_text_items } from './xl8-text.js';
import { createProject, normalize_project, upload_project, load_project, list_projects } from './xl8-projects.js';
import { read_word_file } from './xl8-word.js';

// Shared page state is explicit; handlers and reusable functions are top-level.
const xl8_state = {
    inputMethod: 'paste', project: null, activeId: null, draft: '', modalSnapshot: '',
    inlineEditor: null, rows: new Map(), pendingResolve: null, options: [], saving: false, creating: false
};
const $ = id => document.getElementById(id);
const INPUT_METHODS = ['paste', 'file', 'word'];

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function action_button(text, handler, className = 'button') {
    const node = element('button', text, className);
    node.type = 'button';
    node.setAttribute('onclick', handler);
    return node;
}

function set_language(node, language) { node.lang = language; node.dir = direction(language); }

function show_error(error) {
    const box = $('error');
    box.textContent = error.message || String(error);
    box.hidden = false;
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) { box.scrollIntoView({ block: 'nearest' }); return; }
    let message = dialog.querySelector('.dialog-error');
    if (!message) {
        message = element('p', undefined, 'message error dialog-error');
        message.setAttribute('role', 'alert'); dialog.prepend(message);
    }
    message.textContent = box.textContent;
    message.scrollIntoView({ block: 'nearest' });
}

function clear_error() {
    $('error').hidden = true; $('error').textContent = '';
    document.querySelectorAll('.dialog-error').forEach(message => message.remove());
}

function setup_input() {
    for (const id of ['source-language', 'target-language']) {
        for (const [value, name] of Object.entries(LANGUAGES)) $(id).add(new Option(name, value));
    }
    $('source-language').value = 'en'; $('target-language').value = 'ar';
    MODELS.forEach(model => $('model').add(new Option(model, model)));
}

function change_input_method(method, focus = false) {
    xl8_state.inputMethod = method;
    for (const value of INPUT_METHODS) {
        const selected = value === method;
        $(value + '-tab').setAttribute('aria-selected', String(selected));
        $(value + '-tab').tabIndex = selected ? 0 : -1;
        $(value + '-panel').hidden = !selected;
    }
    if (focus) $(method + '-tab').focus();
}

function input_tab_key(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = INPUT_METHODS.indexOf(xl8_state.inputMethod);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? INPUT_METHODS.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + INPUT_METHODS.length) % INPUT_METHODS.length;
    change_input_method(INPUT_METHODS[next], true);
}

function update_source_language(language) { set_language($('source-text'), language); }
function update_file_status(file, method = 'file') { $(method + '-status').textContent = file ? `${file.name} · ${Math.ceil(file.size / 1024)} KB` : 'No file selected.'; }

function load_sample() {
    change_input_method('paste'); $('source-text').value = SAMPLE_TEXT;
    $('source-language').value = 'en'; $('target-language').value = 'ar';
    update_source_language('en'); $('source-text').focus();
}

/** Read form values and source content. No application text/file-size cap. */
async function read_project_input() {
    let text = $('source-text').value;
    let documentName = 'Pasted text';
    if (xl8_state.inputMethod === 'file') {
        const file = $('source-file').files[0];
        if (!file) throw new Error('Choose a TXT file to import.');
        if (!/\.txt$/i.test(file.name)) throw new Error('Choose a .txt document, or use the Word file tab for .docx files.');
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
        catch { throw new Error('This file could not be read as UTF-8 text. Save it with UTF-8 encoding and try again.'); }
        documentName = file.name;
    }
    if (xl8_state.inputMethod === 'word') {
        const file = $('word-file').files[0];
        text = await window.read_word_file(file);
        documentName = file.name;
    }
    if (!text.trim()) throw new Error('Add some source text before creating a project.');
    if ($('source-language').value === $('target-language').value) throw new Error('Choose two different languages.');
    return {
        name: $('project-name').value, documentName, documentId: crypto.randomUUID(), text,
        sourceLanguage: $('source-language').value, targetLanguage: $('target-language').value,
        model: $('model').value, prompt: $('prompt').value
    };
}

function submit_project(event) { event.preventDefault(); void create_project(); return false; }

/** Orchestrate input → splitter → project JSON → storage confirmation. */
async function create_project() {
    if (xl8_state.creating) return null;
    xl8_state.creating = true; $('create-project').disabled = true; $('create-project').textContent = 'Reading source…'; clear_error();
    try {
        const input = await read_project_input();
        const items = await window.split_text(input.text, input);
        const project = normalize_project(createProject(input, items));
        const result = await window.upload_project(project);
        if (!result?.confirmation?.saved || !result.project?.id) throw new Error('Project creation was not confirmed. Keep your source text and try again.');
        location.href = `editor.html?project=${encodeURIComponent(result.project.id)}`;
        return result;
    } catch (error) { show_error(error); return null; }
    finally { xl8_state.creating = false; $('create-project').disabled = false; $('create-project').textContent = 'Create project'; }
}

async function deploy_project_list() {
    const projects = await window.list_projects();
    const container = $('project-list'); container.replaceChildren();
    if (!projects.length) {
        const empty = element('div', undefined, 'empty-state');
        empty.append(element('h2', 'Your next translation starts here'), element('p', 'Add source text or a TXT document to create your first project.'));
        const link = element('a', 'New translation', 'button primary'); link.href = 'index.html';
        link.setAttribute('onclick', 'return navigate_to(this, event)'); empty.append(link); container.append(empty);
        return projects;
    }
    const scroll = element('div', undefined, 'table-scroll');
    const table = element('table', undefined, 'project-table');
    const header = element('tr');
    for (const label of ['Project / document', 'Languages', 'Progress', 'Updated', '']) {
        const th = element('th', label); th.scope = 'col'; header.append(th);
    }
    const thead = element('thead'); thead.append(header);
    const tbody = element('tbody');
    for (const project of projects) {
        const document = project.documents[0]; const tr = element('tr');
        const name = element('td'); name.append(element('strong', project.name), element('small', document.name));
        const languages = element('td', `${LANGUAGES[project.sourceLanguage]} → ${LANGUAGES[project.targetLanguage]}`);
        const progress = element('td', `${document.segments.filter(item => item.trg_text.trim()).length} / ${document.segments.length}`);
        const updated = element('td');
        const time = element('time', new Date(project.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })); time.dateTime = project.updatedAt; updated.append(time);
        const action = element('td'); const link = element('a', 'Open', 'button');
        link.href = `editor.html?project=${encodeURIComponent(project.id)}`; link.setAttribute('aria-label', `Open ${project.name}`);
        link.setAttribute('onclick', 'return navigate_to(this, event)'); action.append(link);
        tr.append(name, languages, progress, updated, action); tbody.append(tr);
    }
    table.append(element('caption', 'Projects saved in this browser', 'sr-only'), thead, tbody);
    scroll.append(table); container.append(scroll);
    return projects;
}

/** Load saved pairs unchanged. A backend may return raw text without segments. */
async function deploy_translation(translation_id) {
    const project = await window.load_project(translation_id);
    if (!project) { $('missing-project').hidden = false; $('workspace').hidden = true; return null; }
    const document = project.documents[0];
    if (!Array.isArray(document.segments)) {
        document.segments = await window.split_text(document.originalText, { ...project, documentId: document.id });
    }
    const normalized = normalize_project(project);
    $('missing-project').hidden = true; $('workspace').hidden = false;
    $('project-label').textContent = normalized.name;
    $('document-title').textContent = normalized.documents[0].name;
    window.document.title = `${normalized.name} | XL8 · ARBSQ`;
    $('saved-model').textContent = normalized.model;
    $('saved-prompt').textContent = normalized.prompt || 'No additional prompt';
    $('language-pair').textContent = `${LANGUAGES[normalized.sourceLanguage]} → ${LANGUAGES[normalized.targetLanguage]}`;
    $('source-heading').textContent = `Source · ${LANGUAGES[normalized.sourceLanguage]}`;
    $('target-heading').textContent = `Target · ${LANGUAGES[normalized.targetLanguage]}`;
    window.deploy_translation_table(normalized.documents[0].segments, normalized);
    return normalized;
}

/** Input: sentence records and project context. Output: the populated table body. */
function deploy_translation_table(text_items, project_info = xl8_state.project) {
    if (!project_info) throw new Error('Load a project before displaying its sentence pairs.');
    const items = normalize_text_items(text_items, project_info.documents[0].id);
    xl8_state.project = { ...project_info, documents: [{ ...project_info.documents[0], segments: items }] };
    xl8_state.activeId = null; xl8_state.draft = ''; xl8_state.inlineEditor = null; xl8_state.rows.clear();
    const tbody = $('segments'); tbody.replaceChildren();
    for (const [index, item] of items.entries()) {
        const row = element('tr'); row.dataset.segmentId = item.id;
        const number = element('td', String(index + 1), 'segment-number');
        const source = element('td'); source.id = item.src_id; source.dataset.segmentId = item.id; set_language(source, project_info.sourceLanguage);
        // Document text is content, not a button: selecting it must not move focus.
        source.append(element('div', item.src_text, 'cell-text'));
        const target = element('td', undefined, 'xl8-target'); target.id = item.trg_id; target.dataset.segmentId = item.id; target.dataset.sourceId = item.src_id; set_language(target, project_info.targetLanguage);
        row.append(number, source, target); tbody.append(row);
        xl8_state.rows.set(item.id, { row, source, target, number: index + 1 }); restore_target(item.id);
    }
    update_progress(); $('save-status').textContent = 'Saved in this browser';
    return tbody;
}

function current_document() { return xl8_state.project?.documents[0]; }
function current_segment() { return current_document()?.segments.find(item => item.id === xl8_state.activeId); }
function has_unapplied_changes() { return !!current_segment() && xl8_state.draft !== current_segment().trg_text; }
function update_progress() { $('progress').textContent = `${current_document().segments.filter(item => item.trg_text.trim()).length} of ${current_document().segments.length} translated`; }
function update_draft(value) { xl8_state.draft = value; $('save-status').textContent = has_unapplied_changes() ? 'Unapplied changes' : 'Saved in this browser'; }

async function save_draft() {
    if (xl8_state.saving) return false;
    if (!current_segment() || !has_unapplied_changes()) return true;
    xl8_state.saving = true;
    const capturedDraft = xl8_state.draft;
    const next = structuredClone(xl8_state.project);
    next.documents[0].segments.find(item => item.id === xl8_state.activeId).trg_text = capturedDraft;
    next.updatedAt = new Date().toISOString();
    try {
        const result = await window.upload_project(next);
        if (!result?.confirmation?.saved || !result.project) throw new Error('Translation save was not confirmed. Apply again to retry.');
        xl8_state.project = normalize_project(result.project); clear_error(); update_progress();
        if (xl8_state.draft === capturedDraft) {
            xl8_state.draft = current_segment().trg_text;
            if (xl8_state.inlineEditor) xl8_state.inlineEditor.value = xl8_state.draft;
        }
        $('save-status').textContent = has_unapplied_changes() ? 'Unapplied changes' : 'Saved in this browser';
        return !has_unapplied_changes();
    } catch (error) { show_error(error); $('save-status').textContent = 'Not saved · apply to retry'; return false; }
    finally { xl8_state.saving = false; }
}

function finish_pending(result) {
    $('pending-dialog').close();
    const resolve = xl8_state.pendingResolve; xl8_state.pendingResolve = null;
    if (!result) xl8_state.inlineEditor?.focus();
    if (resolve) resolve(result);
}

async function resolve_draft() {
    if (xl8_state.saving) return false;
    if (!has_unapplied_changes()) return true;
    if (xl8_state.pendingResolve) return false;
    return new Promise(set_pending_resolver);
}

function set_pending_resolver(resolve) { xl8_state.pendingResolve = resolve; $('pending-dialog').showModal(); }
function keep_editing() { if (!xl8_state.saving) finish_pending(false); }
function cancel_pending(event) { event.preventDefault(); keep_editing(); }
function discard_draft() { if (xl8_state.saving) return; update_draft(current_segment().trg_text); xl8_state.inlineEditor.value = xl8_state.draft; finish_pending(true); }
async function apply_and_continue() { if (await save_draft()) finish_pending(true); }

function restore_target(id) {
    const item = current_document().segments.find(entry => entry.id === id);
    const nodes = xl8_state.rows.get(id); nodes.row.classList.remove('active'); nodes.target.replaceChildren();
    const text = element('div', item.trg_text || 'No translation yet', 'cell-text');
    if (!item.trg_text) { text.classList.add('target-placeholder'); set_language(text, 'en'); }
    const button = action_button(item.trg_text ? 'Edit' : 'Translate', 'select_segment(this.dataset.segmentId)', 'button edit-translation');
    button.dataset.segmentId = id; set_language(button, 'en');
    button.setAttribute('aria-label', `Edit target segment ${nodes.number}`);
    nodes.target.append(text, button);
}

async function select_segment(id) {
    if (id === xl8_state.activeId) { xl8_state.inlineEditor?.focus(); return; }
    if (!await resolve_draft()) return;
    if (xl8_state.activeId) restore_target(xl8_state.activeId);
    xl8_state.activeId = id; xl8_state.draft = current_segment().trg_text;
    const nodes = xl8_state.rows.get(id); nodes.row.classList.add('active');
    const wrapper = element('div', undefined, 'inline-editor'); wrapper.lang = 'en'; wrapper.dir = 'ltr';
    const menu = element('div', undefined, 'segment-menu');
    const more = action_button('Show more', 'open_resources()'); more.setAttribute('aria-haspopup', 'dialog');
    const actions = element('div', undefined, 'edit-actions');
    actions.append(action_button('Cancel', 'cancel_edit()'), action_button('Apply', 'apply_edit()', 'button primary')); menu.append(more, actions);
    const textarea = element('textarea'); textarea.id = `edit-${id}`; textarea.value = xl8_state.draft;
    textarea.setAttribute('oninput', 'update_draft(this.value)'); set_language(textarea, xl8_state.project.targetLanguage);
    xl8_state.inlineEditor = textarea;
    const label = element('label', `Target translation · segment ${nodes.number}`); label.htmlFor = textarea.id;
    wrapper.append(menu, label, textarea); nodes.target.replaceChildren(wrapper); textarea.focus();
}

function close_editor() {
    const previous = xl8_state.activeId; restore_target(previous);
    xl8_state.activeId = null; xl8_state.inlineEditor = null;
    xl8_state.rows.get(previous).target.querySelector('button').focus();
}
function cancel_edit() { if (xl8_state.saving) return; update_draft(current_segment().trg_text); close_editor(); }
async function apply_edit() { if (await save_draft()) close_editor(); }

function open_resources() {
    xl8_state.modalSnapshot = xl8_state.draft;
    $('modal-source').textContent = current_segment().src_text; set_language($('modal-source'), xl8_state.project.sourceLanguage);
    $('modal-target').value = xl8_state.draft; set_language($('modal-target'), xl8_state.project.targetLanguage);
    $('segment-dialog-title').textContent = `Segment ${xl8_state.rows.get(xl8_state.activeId).number} · translation options`;
    const sample = sampleResources(current_segment().src_text, xl8_state.project.sourceLanguage, xl8_state.project.targetLanguage);
    const provided = current_segment().translations;
    xl8_state.options = provided.length ? provided : sample.suggestions.map((text, index) => ({ model: `Sample ${index + 1}`, text, sample: true }));
    $('resource-note').textContent = provided.length ? 'Translation options supplied with this sentence. Model requests are not made by this page.' : 'Sample content only. Suggestions and terminology are not generated from your model or prompt.';
    $('suggestions').replaceChildren(); $('terms').replaceChildren();
    if (!xl8_state.options.length) $('suggestions').append(element('p', 'No suggestions for this sentence yet. You can write your translation above.', 'help'));
    for (const [index, option] of xl8_state.options.entries()) {
        const card = element('div', undefined, 'suggestion'); const text = element('p', option.text); set_language(text, xl8_state.project.targetLanguage);
        const label = option.sample ? `Use sample ${index + 1}` : `Use ${option.model || 'translation option'}`;
        const button = action_button(label, 'use_translation(Number(this.dataset.optionIndex))'); button.dataset.optionIndex = index;
        card.append(text, button); $('suggestions').append(card);
    }
    const terms = current_segment().terminology || sample.terms.map(([source, target]) => ({ source, target }));
    if (!terms.length) $('terms').append(element('p', 'No terminology available for this sentence.', 'help'));
    for (const term of terms) {
        const pair = element('div', undefined, 'term-pair'); const source = element('span', term.source); const target = element('span', term.target);
        set_language(source, xl8_state.project.sourceLanguage); set_language(target, xl8_state.project.targetLanguage); pair.append(source, target); $('terms').append(pair);
    }
    $('segment-dialog').showModal();
}

function sync_modal_draft(value) { update_draft(value); xl8_state.inlineEditor.value = value; }
function use_translation(index) { $('modal-target').value = xl8_state.options[index].text; sync_modal_draft($('modal-target').value); $('modal-target').focus(); }
function cancel_resources() { if (xl8_state.saving) return; update_draft(xl8_state.modalSnapshot); xl8_state.inlineEditor.value = xl8_state.draft; $('segment-dialog').close(); xl8_state.inlineEditor.focus(); }
function cancel_resources_event(event) { event.preventDefault(); cancel_resources(); }
async function apply_resources() { if (await save_draft()) { $('segment-dialog').close(); xl8_state.inlineEditor.focus(); } }

async function export_translation() {
    if (!await resolve_draft()) return;
    const missing = current_document().segments.filter(item => !item.trg_text.trim()).length;
    if (missing) { $('export-warning').textContent = `${missing} of ${current_document().segments.length} segments have no translation. Their text will be empty in the exported file.`; $('export-dialog').showModal(); }
    else download_translation();
}

function download_translation() {
    const document = current_document();
    const blob = new Blob([exportTranslation(document.segments)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = element('a'); link.href = url;
    link.download = exportFilename(document.name === 'Pasted text' ? xl8_state.project.name : document.name);
    window.document.body.append(link); link.click(); link.remove(); setTimeout(release_download, 1000, url);
}
function release_download(url) { URL.revokeObjectURL(url); }
function cancel_export() { $('export-dialog').close(); }
function confirm_export() { cancel_export(); download_translation(); }

/** Synchronous HTML link handler; async draft resolution happens before navigation. */
function navigate_to(link, event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !has_unapplied_changes()) return true;
    const url = new URL(link.href, location.href);
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return true;
    event.preventDefault(); void continue_navigation(link.href); return false;
}
async function continue_navigation(href) { if (await resolve_draft()) location.href = href; }
function warn_unapplied(event) { if (has_unapplied_changes()) { event.preventDefault(); event.returnValue = ''; return ''; } }

async function initialize_xl8() {
    try {
        if (document.body.dataset.page === 'input') setup_input();
        if (document.body.dataset.page === 'dashboard') await deploy_project_list();
        if (document.body.dataset.page === 'editor') await deploy_translation(new URLSearchParams(location.search).get('project'));
    } catch (error) { show_error(error); }
}

// Inline HTML handlers need explicit global names when using module scripts.
// Replacing these async functions is the supported backend integration seam.
Object.assign(window, {
    create_project, submit_project, upload_project, load_project, list_projects, split_text, read_word_file,
    deploy_translation, deploy_translation_table, deploy_project_list, read_project_input,
    change_input_method, input_tab_key, update_source_language, update_file_status, load_sample,
    select_segment, update_draft, apply_edit, cancel_edit, open_resources, sync_modal_draft,
    use_translation, cancel_resources, cancel_resources_event, apply_resources,
    keep_editing, discard_draft, apply_and_continue, cancel_pending, export_translation,
    cancel_export, confirm_export, navigate_to, warn_unapplied
});
void initialize_xl8();
