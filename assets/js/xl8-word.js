/** Input: a selected DOCX File. Output: plain text, including paragraph breaks. */
export async function read_word_file(file, parser = globalThis.mammoth) {
    if (!file) throw new Error('Choose a Word (.docx) file to import.');
    if (/\.doc$/i.test(file.name)) throw new Error('Older .doc files are not supported. Open the file in Word and save it as .docx, then try again.');
    if (!/\.docx$/i.test(file.name)) throw new Error('Choose a Word (.docx) file.');
    if (!parser?.convertToHtml) throw new Error('Word import could not load. Refresh the page and try again.');
    const result = { value: '' };
    try {
        const arrayBuffer = await file.arrayBuffer();
        // extractRawText drops manual Word line breaks. Read the parsed document
        // instead, then return an empty document so images/HTML are not converted.
        await parser.convertToHtml({ arrayBuffer }, {
            transformDocument: collect_word_text.bind(null, result),
            includeEmbeddedStyleMap: false,
            includeDefaultStyleMap: false
        });
    } catch {
        throw new Error('This Word file could not be read. It may be damaged, password-protected, or not a DOCX document. Try opening it in Word and saving a new .docx copy.');
    }
    if (typeof result.value !== 'string' || !result.value.trim()) {
        throw new Error('No readable text was found in this Word file. Images and scanned pages cannot be imported as text.');
    }
    return result.value;
}

function collect_word_text(result, document) {
    result.value = word_element_text(document);
    return { ...document, children: [] };
}

function word_element_text(element) {
    if (element.type === 'text') return element.value;
    if (element.type === 'tab') return '\t';
    if (element.type === 'break') return '\n';
    const text = (element.children || []).map(word_element_text).join('');
    return text + (element.type === 'paragraph' ? '\n\n' : '');
}
