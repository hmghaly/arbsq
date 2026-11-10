export const LANGUAGES = { en: 'English', ar: 'Arabic', fr: 'French', de: 'German', es: 'Spanish', zh: 'Chinese', ru: 'Russian', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', he: 'Hebrew', fa: 'Persian', ur: 'Urdu' };
export const MODELS = ['Google Translate', 'GPT4.1', 'GPT5.1', 'Deepseek-Flash'];
export const SAMPLE_TEXT = 'The meeting opens at nine.\n\nPlease bring the report.';

export function direction(language) {
    return ['ar', 'he', 'fa', 'ur'].includes(language) ? 'rtl' : 'ltr';
}

// Keep the whitespace between sentences so text exports retain paragraphs and lists.
// Older browsers fall back to one segment per nonempty line.
export function segmentText(text, language, Segmenter = Intl.Segmenter) {
    const normalized = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '').trim();
    if (!normalized) return [];
    const sentenceSplitter = Segmenter ? new Segmenter(language, { granularity: 'sentence' }) : null;
    const segments = [];
    let pendingSeparator = '';
    for (const line of normalized.split(/(\n+)/)) {
        if (/^\n+$/.test(line)) { pendingSeparator += line; continue; }
        if (!line.trim()) { pendingSeparator += line; continue; }
        const parts = sentenceSplitter ? Array.from(sentenceSplitter.segment(line), entry => entry.segment) : [line];
        for (const part of parts) {
            const source = part.trim();
            if (!source) { pendingSeparator += part; continue; }
            const leading = part.match(/^\s*/)[0];
            const trailing = part.match(/\s*$/)[0];
            segments.push({ id: crypto.randomUUID(), source, target: '', separator: pendingSeparator + leading });
            pendingSeparator = trailing;
        }
    }
    return segments;
}

export function cellId(documentId, segmentId, side) {
    return `xl8-${documentId}-${segmentId}-${side}`;
}

export function exportTranslation(segments) {
    return segments.map(segment => segment.separator + (segment.trg_text ?? segment.target ?? '')).join('');
}

export function exportFilename(name) {
    return (name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().slice(0, 100) || 'translation') + '-translation.txt';
}

export function sampleResources(source, sourceLanguage, targetLanguage) {
    if (sourceLanguage !== 'en' || targetLanguage !== 'ar') return { suggestions: [], terms: [] };
    const samples = {
        'The meeting opens at nine.': { suggestions: ['يبدأ الاجتماع في الساعة التاسعة.', 'يُفتتح الاجتماع عند الساعة التاسعة.'], terms: [['meeting', 'اجتماع'], ['nine', 'التاسعة']] },
        'Please bring the report.': { suggestions: ['يرجى إحضار التقرير.', 'يُرجى أن تحضر التقرير معك.'], terms: [['report', 'تقرير']] }
    };
    return samples[source] || { suggestions: [], terms: [] };
}

/** Public sentence interface. Existing source/target records remain readable. */
export function normalize_text_items(items, documentId = 'document') {
    if (!Array.isArray(items) || !items.length) throw new Error('The document must contain at least one sentence.');
    const usedIds = new Set();
    const segmentIds = new Set();
    return items.map((item, index) => {
        if (!item || typeof item !== 'object') throw new Error('Invalid sentence record.');
        const id = item.id || item.src_id || crypto.randomUUID();
        const normalized = {
            ...item, id,
            src_id: item.src_id || cellId(documentId, id, 'source'),
            src_text: item.src_text ?? item.source,
            trg_id: item.trg_id || cellId(documentId, id, 'target'),
            trg_text: item.trg_text ?? item.target ?? '',
            translations: item.translations ?? [],
            separator: item.separator ?? (index === 0 ? '' : ' ')
        };
        delete normalized.source;
        delete normalized.target;
        if (typeof id !== 'string' || !/^[a-zA-Z0-9_.:-]+$/.test(id) || segmentIds.has(id)
            || typeof normalized.src_text !== 'string' || !normalized.src_text.trim()
            || typeof normalized.trg_text !== 'string' || typeof normalized.separator !== 'string'
            || !/^\s*$/.test(normalized.separator) || !Array.isArray(normalized.translations)
            || !normalized.translations.every(option => option && typeof option === 'object' && typeof option.text === 'string')) {
            throw new Error('Invalid sentence text, translation options, or separator.');
        }
        segmentIds.add(id);
        for (const cell of [normalized.src_id, normalized.trg_id]) {
            if (typeof cell !== 'string' || !cell || /\s/.test(cell) || usedIds.has(cell)) throw new Error('Sentence cell IDs must be unique and contain no whitespace.');
            usedIds.add(cell);
        }
        return normalized;
    });
}

/** Replace this function with an async backend splitter if needed. */
export function split_text(text, project_info = {}) {
    const segments = segmentText(text, project_info.sourceLanguage || 'en');
    if (!segments.length) return [];
    return normalize_text_items(segments, project_info.documentId || 'document');
}
