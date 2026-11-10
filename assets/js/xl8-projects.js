import { LANGUAGES, MODELS, segmentText, normalize_text_items } from './xl8-text.js';

export const STORAGE_KEY = 'arbsq.xl8.projects.v1';
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]+$/.test(value);
const isText = value => typeof value === 'string';

function validProject(project) {
    if (!project || project.version !== 1 || !validId(project.id) || !isText(project.name)
        || !Object.hasOwn(LANGUAGES, project.sourceLanguage) || !Object.hasOwn(LANGUAGES, project.targetLanguage)
        || project.sourceLanguage === project.targetLanguage || !MODELS.includes(project.model) || !isText(project.prompt)
        || !isText(project.createdAt) || !isText(project.updatedAt) || !Number.isFinite(Date.parse(project.createdAt))
        || !Number.isFinite(Date.parse(project.updatedAt)) || !Array.isArray(project.documents) || project.documents.length !== 1) return false;
    const document = project.documents[0];
    if (!document || !validId(document.id) || !isText(document.name) || !isText(document.originalText)
        || !Array.isArray(document.segments) || document.segments.length === 0) return false;
    const ids = new Set();
    return document.segments.every(segment => {
        if (!segment || !validId(segment.id) || ids.has(segment.id) || !isText(segment.source) || !segment.source.trim()
            || !isText(segment.target) || !isText(segment.separator) || !/^\s*$/.test(segment.separator)) return false;
        ids.add(segment.id);
        return true;
    });
}

export function createProject({ name, documentName, documentId, text, sourceLanguage, targetLanguage, model, prompt }, text_items) {
    const now = new Date().toISOString();
    const project = {
        version: 1, id: crypto.randomUUID(), name: name.trim() || 'Untitled project',
        sourceLanguage, targetLanguage, model, prompt, createdAt: now, updatedAt: now,
        documents: [{ id: documentId || crypto.randomUUID(), name: documentName || 'Pasted text', originalText: text,
            segments: text_items === undefined ? segmentText(text, sourceLanguage) : storage_text_items(text_items) }]
    };
    if (!validProject(project)) throw new Error('Enter source text and choose two different languages.');
    return project;
}

// Read before every write. Unreadable records are never overwritten.
export function read_local_projects(storage) {
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch { throw new Error('Browser storage is unavailable. Allow site storage to open or save projects.'); }
    if (raw === null) return [];
    try {
        const projects = JSON.parse(raw);
        if (!Array.isArray(projects) || !projects.every(validProject) || new Set(projects.map(project => project.id)).size !== projects.length) throw new Error();
        // Also validate explicit cell IDs and translation options when present.
        projects.forEach(project => normalize_project(project));
        return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
        throw new Error('Saved XL8 data could not be read. It has been left untouched. Try the browser where you created the project or restore your browser data.');
    }
}

export function find_local_project(storage, id) {
    return read_local_projects(storage).find(project => project.id === id) || null;
}

export function save_local_project(storage, project) {
    if (!validProject(project)) throw new Error('This project could not be saved because its data is invalid.');
    normalize_project(project);
    const projects = read_local_projects(storage);
    const index = projects.findIndex(item => item.id === project.id);
    if (index === -1) projects.push(project); else projects[index] = project;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(projects)); }
    catch { throw new Error('Project was not saved. Browser storage may be full or blocked. Keep this page open and try again.'); }
}

// Compatibility for existing callers; the UI uses the async functions below.
export function projectStore(storage) {
    return {
        list: read_local_projects.bind(null, storage),
        load: find_local_project.bind(null, storage),
        save: save_local_project.bind(null, storage)
    };
}

export function normalize_project(project) {
    return {
        ...project,
        documents: project.documents.map(document => ({
            ...document, segments: normalize_text_items(document.segments, document.id)
        }))
    };
}

// Persist the original source/target field names so existing browser projects and
// older callers can still read them. All additional sentence metadata is retained.
export function storage_text_items(items) {
    return normalize_text_items(items).map(item => {
        const { src_text, trg_text, ...metadata } = item;
        return { ...metadata, source: src_text, target: trg_text };
    });
}

export function local_storage(storage) {
    if (storage) return storage;
    try { return window.localStorage; }
    catch { throw new Error('Browser storage is unavailable. Allow site storage to open or save projects.'); }
}

/** Input: project JSON. Output: { project, confirmation }. Replace for backend saves. */
export async function upload_project(project_info, storage) {
    const project = normalize_project(project_info);
    const stored = {
        ...project,
        documents: project.documents.map(document => ({ ...document, segments: storage_text_items(document.segments) }))
    };
    save_local_project(local_storage(storage), stored);
    return { project, confirmation: { saved: true, project_id: project.id } };
}

/** Input: project ID. Output: project JSON or null. Does not split saved sentences. */
export async function load_project(translation_id, storage) {
    const project = find_local_project(local_storage(storage), translation_id);
    return project ? normalize_project(project) : null;
}

/** Output: saved project JSON records, newest first. */
export async function list_projects(storage) {
    return read_local_projects(local_storage(storage)).map(normalize_project);
}
