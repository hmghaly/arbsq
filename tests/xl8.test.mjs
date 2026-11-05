import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentText, exportTranslation, cellId, sampleResources, exportFilename } from '../assets/js/xl8-text.js';
import { createProject, projectStore, STORAGE_KEY } from '../assets/js/xl8-projects.js';

function memoryStorage() {
    const values = new Map();
    return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) };
}
const input = overrides => ({ name: 'Report', documentName: 'report.txt', text: 'Hello world. Welcome.\n\nThank you.', sourceLanguage: 'en', targetLanguage: 'ar', model: 'GPT4.1', prompt: 'Use formal Arabic.', ...overrides });

test('segments English sentences and retains paragraph/list separators for Unicode export', () => {
    const segments = segmentText('Hello world. Welcome.\r\n\r\nThank you.\nNext item.', 'en');
    assert.deepEqual(segments.map(item => item.source), ['Hello world.', 'Welcome.', 'Thank you.', 'Next item.']);
    ['مرحباً.', 'أهلاً.\nوسهلاً.', 'شكراً.', 'البند التالي.'].forEach((target, index) => segments[index].target = target);
    assert.equal(exportTranslation(segments), 'مرحباً. أهلاً.\nوسهلاً.\n\nشكراً.\nالبند التالي.');
});

test('segments Arabic punctuation and supports the documented newline fallback', () => {
    assert.deepEqual(segmentText('مرحباً. كيف حالك؟\n\nشكراً لك.', 'ar').map(item => item.source), ['مرحباً.', 'كيف حالك؟', 'شكراً لك.']);
    const fallback = segmentText('One. Two.\n\nThree.', 'en', null);
    assert.deepEqual(fallback.map(item => item.source), ['One. Two.', 'Three.']);
    assert.equal(fallback[1].separator, '\n\n');
    assert.deepEqual(segmentText(' \n ', 'en'), []);
});

test('editing one segment survives reopening without changing paired IDs or other targets', () => {
    const storage = memoryStorage();
    const store = projectStore(storage);
    const project = createProject(input()); store.save(project);
    const ids = project.documents[0].segments.map(item => cellId(project.documents[0].id, item.id, 'target'));
    const edited = store.load(project.id);
    edited.documents[0].segments[1].target = 'أهلاً بك.'; store.save(edited);
    const reopened = projectStore(storage).load(project.id);
    assert.deepEqual(reopened.documents[0].segments.map(item => item.target), ['', 'أهلاً بك.', '']);
    assert.deepEqual(reopened.documents[0].segments.map(item => cellId(reopened.documents[0].id, item.id, 'target')), ids);
    assert.equal(new Set(ids).size, 3);
    assert.equal(reopened.model, 'GPT4.1'); assert.equal(reopened.prompt, 'Use formal Arabic.');
    assert.equal(reopened.documents[0].originalText, input().text);
});

test('lists all saved projects and returns null for a missing project', () => {
    const store = projectStore(memoryStorage());
    store.save(createProject(input())); store.save(createProject(input({ name: 'Second' })));
    assert.equal(store.list().length, 2); assert.equal(store.load('missing'), null);
});

test('corrupt, duplicate, or unsupported saved records are not overwritten', () => {
    for (const raw of ['{invalid', '{}', '[{"version":2}]', 'null']) {
        const storage = memoryStorage(); storage.setItem(STORAGE_KEY, raw);
        assert.throws(() => projectStore(storage).save(createProject(input())), /left untouched/);
        assert.equal(storage.getItem(STORAGE_KEY), raw);
    }
    const storage = memoryStorage(); const project = createProject(input());
    storage.setItem(STORAGE_KEY, JSON.stringify([project, project]));
    assert.throws(() => projectStore(storage).list(), /left untouched/);
});

test('blocked reads and full-storage writes fail visibly without changing saved data', () => {
    assert.throws(() => projectStore({ getItem() { throw Error(); } }).list(), /unavailable/);
    const storage = memoryStorage(); const project = createProject(input()); const store = projectStore(storage); store.save(project);
    const before = storage.getItem(STORAGE_KEY); storage.setItem = () => { throw Error('QuotaExceededError'); };
    project.documents[0].segments[0].target = 'غير محفوظ';
    assert.throws(() => store.save(project), /not saved/);
    assert.equal(storage.getItem(STORAGE_KEY), before);
});

test('export keeps empty segment positions and text literally, and produces safe filenames', () => {
    assert.equal(exportTranslation([{ separator:'', target:'<b>Literal</b>' }, { separator:'\n\n', target:'' }, { separator:'\n', target:'عربي' }]), '<b>Literal</b>\n\n\nعربي');
    assert.equal(exportFilename('../Report: final.txt'), '.._Report_ final-translation.txt');
    assert.equal(exportFilename('تقرير.txt'), 'تقرير-translation.txt');
});

test('sample resources apply only to the matching source and language pair', () => {
    assert.equal(sampleResources('The meeting opens at nine.', 'en', 'ar').suggestions.length, 2);
    assert.equal(sampleResources('Unrelated sentence.', 'en', 'ar').suggestions.length, 0);
    assert.equal(sampleResources('The meeting opens at nine.', 'en', 'fr').suggestions.length, 0);
});

test('invalid language pairs, empty documents and duplicate segment IDs are rejected', () => {
    assert.throws(() => createProject(input({ text: '' })));
    assert.throws(() => createProject(input({ targetLanguage: 'en' })));
    const project = createProject(input()); project.documents[0].segments[1].id = project.documents[0].segments[0].id;
    assert.throws(() => projectStore(memoryStorage()).save(project), /invalid/);
});
