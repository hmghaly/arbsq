import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { File } from 'node:buffer';
import { read_word_file } from '../assets/js/xl8-word.js';
import { split_text } from '../assets/js/xl8-text.js';
import { createProject, normalize_project, upload_project, load_project } from '../assets/js/xl8-projects.js';

const require = createRequire(import.meta.url);
const mammoth = require('../assets/vendor/mammoth-1.13.0/mammoth.browser.min.js');
const bytes = await readFile(new URL('./fixtures/xl8-word.docx', import.meta.url));
const word = new File([bytes], 'Report.DOCX');
const expected = 'First paragraph. Second sentence.\n\nمرحبا بالعالم.\n\nFirst line\nSecond line\n\nName\n\nValue\n\n<b>Literal text</b>\n\n42\n\n';

test('DOCX import extracts paragraph, Arabic, line-break and table text using the shipped browser parser', async () => {
    assert.equal(await read_word_file(word, mammoth), expected);
});

test('imported Word text follows the existing splitter and storage workflow', async () => {
    const text = await read_word_file(word, mammoth);
    const settings = {name:'Word report', documentName:word.name, documentId:'word-document', text,
        sourceLanguage:'en', targetLanguage:'ar', model:'GPT4.1', prompt:''};
    const items = split_text(text, settings);
    assert.deepEqual(items.slice(0, 3).map(item => item.src_text), ['First paragraph.', 'Second sentence.', 'مرحبا بالعالم.']);
    assert.equal(items[2].separator, '\n\n');
    const data = new Map();
    const storage = {getItem:key=>data.get(key) ?? null, setItem:(key,value)=>data.set(key,value)};
    const result = await upload_project(normalize_project(createProject(settings, items)), storage);
    const reopened = await load_project(result.project.id, storage);
    assert.equal(reopened.documents[0].name, 'Report.DOCX');
    assert.equal(reopened.documents[0].originalText, expected);
    assert.deepEqual(reopened.documents[0].segments, items);
});

test('missing, older DOC and unrelated file formats produce actionable errors', async () => {
    await assert.rejects(read_word_file(null, mammoth), /Choose a Word/);
    await assert.rejects(read_word_file(new File([bytes], 'report.doc'), mammoth), /save it as .docx/);
    await assert.rejects(read_word_file(new File([bytes], 'report.pdf'), mammoth), /Choose a Word/);
});

test('corrupt, mislabeled, and empty documents fail without producing source text', async () => {
    await assert.rejects(read_word_file(new File(['not a zip'], 'broken.docx'), mammoth), /could not be read/);
    const empty = await readFile(new URL('./fixtures/xl8-word-empty.docx', import.meta.url));
    await assert.rejects(read_word_file(new File([empty], 'empty.docx'), mammoth), /No readable text/);
    await assert.rejects(read_word_file(word, {}), /Refresh the page/);
});
