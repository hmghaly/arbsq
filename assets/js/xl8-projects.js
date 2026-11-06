import { LANGUAGES, MODELS, segmentText } from './xl8-text.js';

export const STORAGE_KEY = 'arbsq.xl8.projects.v1';
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9-]+$/.test(value);
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

export function createProject({ name, documentName, text, sourceLanguage, targetLanguage, model, prompt }) {
    const now = new Date().toISOString();
    const project = {
        version: 1, id: crypto.randomUUID(), name: name.trim() || 'Untitled project',
        sourceLanguage, targetLanguage, model, prompt, createdAt: now, updatedAt: now,
        documents: [{ id: crypto.randomUUID(), name: documentName || 'Pasted text', originalText: text,
            segments: segmentText(text, sourceLanguage) }]
    };
    if (!validProject(project)) throw new Error('Enter source text and choose two different languages.');
    return project;
}

// Read before every write. An unreadable or unsupported record must never be overwritten.
export function projectStore(storage) {
    function list() {
        let raw;
        try { raw = storage.getItem(STORAGE_KEY); }
        catch { throw new Error('Browser storage is unavailable. Allow site storage to open or save projects.'); }
        if (raw === null) return [];
        try {
            const projects = JSON.parse(raw);
            if (!Array.isArray(projects) || !projects.every(validProject) || new Set(projects.map(project => project.id)).size !== projects.length) throw new Error();
            return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        } catch {
            throw new Error('Saved XL8 data could not be read. It has been left untouched. Try the browser where you created the project or restore your browser data.');
        }
    }
    return {
        list,
        load(id) { return list().find(project => project.id === id) || null; },
        save(project) {
            if (!validProject(project)) throw new Error('This project could not be saved because its data is invalid.');
            const projects = list();
            const index = projects.findIndex(item => item.id === project.id);
            if (index === -1) projects.push(project); else projects[index] = project;
            try { storage.setItem(STORAGE_KEY, JSON.stringify(projects)); }
            catch { throw new Error('Project was not saved. Browser storage may be full or blocked. Keep this page open and try again.'); }
        }
    };
}
