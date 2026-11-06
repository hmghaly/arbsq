export const LANGUAGES = { en: 'English', ar: 'Arabic', fr: 'French', de: 'German', es: 'Spanish', zh: 'Chinese', ru: 'Russian', pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', he: 'Hebrew', fa: 'Persian', ur: 'Urdu' };
export const MODELS = ['Google Translate', 'GPT4.1', 'GPT5.1', 'Deepseek-Flash'];
export const MAX_TEXT_BYTES = 1024 * 1024;
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
    return segments.map(segment => segment.separator + segment.target).join('');
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
