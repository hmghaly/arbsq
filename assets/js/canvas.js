/**
 * Canvas – Sentence Alignment & Translation QA
 * All client-side logic: tabs, views, table, cell operations, export
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── DOM References ─────────────────────────────────────
    const inputModule = document.getElementById('inputModule');
    const outputModule = document.getElementById('outputModule');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Input form elements
    const docNameInput = document.getElementById('docName');
    const srcTextInput = document.getElementById('srcTextInput');
    const trgTextInput = document.getElementById('trgTextInput');
    const bitextInput = document.getElementById('bitextInput');
    const srcUrlInput = document.getElementById('srcUrlInput');
    const trgUrlInput = document.getElementById('trgUrlInput');
    const srcFileInput = document.getElementById('srcFileInput');
    const trgFileInput = document.getElementById('trgFileInput');
    const srcLang = document.getElementById('srcLang');
    const trgLang = document.getElementById('trgLang');
    const submitBtn = document.getElementById('submitBtn');

    // Output elements
    const backBtn = document.getElementById('backBtn');
    const modeAlignBtn = document.getElementById('modeAlign');
    const modeQaBtn = document.getElementById('modeQA');
    const alignControls = document.getElementById('alignControls');
    const mergeBtn = document.getElementById('mergeBtn');
    const splitBtn = document.getElementById('splitBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const exportBtn = document.getElementById('exportBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const bitextTableBody = document.getElementById('bitextTableBody');
    const selectionBadge = document.getElementById('selectionBadge');
    const alignView = document.getElementById('alignView');
    const qaView = document.getElementById('qaView');

    // File name displays
    const srcFileName = document.getElementById('srcFileName');
    const trgFileName = document.getElementById('trgFileName');

    // State
    let currentTab = 'source-target';
    let currentMode = 'align';
    let segments = [];
    let selectedRows = new Set();
    let lastClickedRow = null;

    // Tab switching logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            currentTab = target;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `tab-${target}`);
            });
        });
    });

    // File input handlers
    if (srcFileInput) {
        srcFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (srcFileName) {
                srcFileName.textContent = file ? file.name : '';
            }
        });
    }

    if (trgFileInput) {
        trgFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (trgFileName) {
                trgFileName.textContent = file ? file.name : '';
            }
        });
    }

    // File drag-and-drop
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            const input = area.querySelector('input[type="file"]');
            if (input && e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                input.dispatchEvent(new Event('change'));
            }
        });
    });

    // View toggling logic
    function showOutput() {
        inputModule.classList.add('hidden');
        outputModule.classList.add('active');
        outputModule.classList.remove('hidden');
        renderTable();
    }

    function showInput() {
        outputModule.classList.remove('active');
        outputModule.classList.add('hidden');
        inputModule.classList.remove('hidden');
        segments = [];
        selectedRows.clear();
    }

    backBtn.addEventListener('click', showInput);

    // Mode toggle
    modeAlignBtn.addEventListener('click', () => switchMode('align'));
    modeQaBtn.addEventListener('click', () => switchMode('qa'));

    function switchMode(mode) {
        currentMode = mode;
        modeAlignBtn.classList.toggle('active', mode === 'align');
        modeQaBtn.classList.toggle('active', mode === 'qa');

        if (mode === 'align') {
            alignView.classList.remove('hidden');
            qaView.classList.add('hidden');
            alignControls.classList.remove('hidden');
        } else {
            alignView.classList.add('hidden');
            qaView.classList.remove('hidden');
            alignControls.classList.add('hidden');
        }
    }

    //Submit / Process Input
    //TODO: Switch to the actual backend API call logic later
    submitBtn.addEventListener('click', () => {
        const data = gatherInput();
        if (!data) return;
        segments = processInput(data);
        selectedRows.clear();
        showOutput();
    });

    function gatherInput() {
        const docName = docNameInput.value.trim() || 'Untitled';

        let srcText = '', trgText = '', bitext = '', srcUrl = '', trgUrl = '';

        switch (currentTab) {
            case 'source-target':
                srcText = srcTextInput.value.trim();
                trgText = trgTextInput.value.trim();
                if (!srcText && !trgText) {
                    showToast('Please enter source and/or target text.');
                    return null;
                }
                break;
            case 'bitext':
                bitext = bitextInput.value.trim();
                if (!bitext) {
                    showToast('Please paste bitext content.');
                    return null;
                }
                break;
            case 'web-pages':
                srcUrl = srcUrlInput.value.trim();
                trgUrl = trgUrlInput.value.trim();
                if (!srcUrl && !trgUrl) {
                    showToast('Please enter at least one URL.');
                    return null;
                }
                break;
            case 'file-pair':
                if (!srcFileInput.files.length && !trgFileInput.files.length) {
                    showToast('Please select at least one file.');
                    return null;
                }
                break;
        }

        return {
            doc_name: docName,
            src_lang: srcLang.value,
            trg_lang: trgLang.value,
            input_type: currentTab,
            src_text: srcText,
            trg_text: trgText,
            bitext: bitext,
            src_url: srcUrl,
            trg_url: trgUrl,
        };
    }

    /**
     * processInput — stub for backend integration
     * Currently returns mock aligned segments.
     */
    function processInput(data) {
        // If bitext tab, attempt to parse tab-separated pairs
        if (data.input_type === 'bitext' && data.bitext) {
            return parseBitext(data.bitext);
        }

        // If source-target tab with text, split by newlines and pair
        if (data.input_type === 'source-target' && data.src_text && data.trg_text) {
            const srcLines = data.src_text.split(/\n+/).filter(l => l.trim());
            const trgLines = data.trg_text.split(/\n+/).filter(l => l.trim());
            const maxLen = Math.max(srcLines.length, trgLines.length);
            const segs = [];
            for (let i = 0; i < maxLen; i++) {
                segs.push({
                    id: i + 1,
                    src: srcLines[i] || '',
                    trg: trgLines[i] || '',
                });
            }
            return segs.length ? segs : getMockSegments();
        }

        // fallback to mock data
        return getMockSegments();
    }

    function parseBitext(text) {
        const lines = text.split(/\n/).filter(l => l.trim());
        return lines.map((line, i) => {
            const parts = line.split('\t');
            return {
                id: i + 1,
                src: (parts[0] || '').trim(),
                trg: (parts[1] || '').trim(),
            };
        });
    }

    function getMockSegments() {
        return [
            { id: 1, src: "The United Nations was founded in 1945.", trg: "تأسست الأمم المتحدة عام 1945." },
            { id: 2, src: "Its headquarters is in New York City.", trg: "يقع مقرها الرئيسي في مدينة نيويورك." },
            { id: 3, src: "The organization promotes international cooperation.", trg: "تعمل المنظمة على تعزيز التعاون الدولي." },
            { id: 4, src: "There are 193 member states.", trg: "يبلغ عدد الدول الأعضاء 193 دولة." },
            { id: 5, src: "The General Assembly is the main deliberative organ.", trg: "الجمعية العامة هي الجهاز التداولي الرئيسي." },
            { id: 6, src: "The Security Council handles peace and security.", trg: "يتولى مجلس الأمن مسائل السلام والأمن." },
            { id: 7, src: "The Secretary-General is the chief administrative officer.", trg: "الأمين العام هو كبير الموظفين الإداريين." },
            { id: 8, src: "Six official languages are used in its proceedings.", trg: "تُستخدم ست لغات رسمية في أعمالها." },
        ];
    }

    // Table Rendering
    function renderTable() {
        bitextTableBody.innerHTML = '';

        segments.forEach((seg, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = index;

            if (selectedRows.has(index)) {
                tr.classList.add('selected');
            }

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(seg.src)}</td>
                <td dir="rtl">${escapeHtml(seg.trg)}</td>
            `;

            tr.addEventListener('click', (e) => handleRowClick(index, e));
            bitextTableBody.appendChild(tr);
        });

        updateSelectionBadge();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Row Selection
    function handleRowClick(index, e) {
        if (e.shiftKey && lastClickedRow !== null) {
            // Range select
            const start = Math.min(lastClickedRow, index);
            const end = Math.max(lastClickedRow, index);
            if (!e.ctrlKey && !e.metaKey) {
                selectedRows.clear();
            }
            for (let i = start; i <= end; i++) {
                selectedRows.add(i);
            }
        } else if (e.ctrlKey || e.metaKey) {
            // Toggle single
            if (selectedRows.has(index)) {
                selectedRows.delete(index);
            } else {
                selectedRows.add(index);
            }
        } else {
            // Single select
            if (selectedRows.size === 1 && selectedRows.has(index)) {
                selectedRows.clear();
            } else {
                selectedRows.clear();
                selectedRows.add(index);
            }
        }

        lastClickedRow = index;
        renderTable();
    }

    function updateSelectionBadge() {
        const count = selectedRows.size;
        if (count > 0) {
            selectionBadge.textContent = `${count} selected`;
            selectionBadge.classList.remove('hidden');
        } else {
            selectionBadge.classList.add('hidden');
        }
    }

    // Cell Operations
    mergeBtn.addEventListener('click', mergeRows);
    splitBtn.addEventListener('click', splitRow);
    deleteBtn.addEventListener('click', deleteRows);

    function mergeRows() {
        if (selectedRows.size < 2) {
            showToast('Select at least 2 rows to merge.');
            return;
        }

        const indices = Array.from(selectedRows).sort((a, b) => a - b);

        // Check contiguous
        for (let i = 1; i < indices.length; i++) {
            if (indices[i] !== indices[i - 1] + 1) {
                showToast('Can only merge adjacent rows.');
                return;
            }
        }

        const mergedSrc = indices.map(i => segments[i].src).filter(Boolean).join(' ');
        const mergedTrg = indices.map(i => segments[i].trg).filter(Boolean).join(' ');

        // Replace first with merged, remove rest
        segments[indices[0]] = {
            id: segments[indices[0]].id,
            src: mergedSrc,
            trg: mergedTrg,
        };

        // Remove merged rows (from end to avoid index shifting)
        for (let i = indices.length - 1; i >= 1; i--) {
            segments.splice(indices[i], 1);
        }

        // Re-number
        renumberSegments();
        selectedRows.clear();
        selectedRows.add(indices[0]);
        renderTable();
        showToast(`Merged ${indices.length} rows.`);
    }

    function splitRow() {
        if (selectedRows.size !== 1) {
            showToast('Select exactly 1 row to split.');
            return;
        }

        const index = Array.from(selectedRows)[0];
        const seg = segments[index];

        // Split by sentence boundary (period, question mark, exclamation)
        const srcParts = splitBySentence(seg.src);
        const trgParts = splitBySentence(seg.trg);
        const maxParts = Math.max(srcParts.length, trgParts.length);

        if (maxParts < 2) {
            showToast('No sentence boundary found to split on.');
            return;
        }

        const newSegs = [];
        for (let i = 0; i < maxParts; i++) {
            newSegs.push({
                id: 0,
                src: (srcParts[i] || '').trim(),
                trg: (trgParts[i] || '').trim(),
            });
        }

        segments.splice(index, 1, ...newSegs);
        renumberSegments();
        selectedRows.clear();
        renderTable();
        showToast(`Split into ${maxParts} rows.`);
    }

    function splitBySentence(text) {
        if (!text) return [text];
        // Split at sentence-ending punctuation followed by space or end
        const parts = text.split(/(?<=[.!?؟。])\s+/);
        return parts.filter(p => p.trim());
    }

    function deleteRows() {
        if (selectedRows.size === 0) {
            showToast('No rows selected.');
            return;
        }

        const count = selectedRows.size;
        const indices = Array.from(selectedRows).sort((a, b) => b - a);

        indices.forEach(i => segments.splice(i, 1));
        renumberSegments();
        selectedRows.clear();
        renderTable();
        showToast(`Deleted ${count} row(s).`);
    }

    function renumberSegments() {
        segments.forEach((seg, i) => { seg.id = i + 1; });
    }

    // Export / Download
    exportBtn.addEventListener('click', exportTSV);
    downloadBtn.addEventListener('click', downloadProject);

    function exportTSV() {
        if (!segments.length) {
            showToast('No data to export.');
            return;
        }

        const header = 'Source\tTarget\n';
        const rows = segments.map(s => `${s.src}\t${s.trg}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/tab-separated-values;charset=utf-8' });
        downloadBlob(blob, `${docNameInput.value || 'export'}.tsv`);
        showToast('Exported as TSV.');
    }

    function downloadProject() {
        const project = {
            doc_name: docNameInput.value || 'Untitled',
            src_lang: srcLang.value,
            trg_lang: trgLang.value,
            exported_at: new Date().toISOString(),
            segments: segments,
        };

        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${docNameInput.value || 'project'}.json`);
        showToast('Downloaded project as JSON.');
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // Toast Notifications
    function showToast(message) {
        const existing = document.querySelector('.canvas-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'canvas-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 3000);
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Only in output mode
        if (outputModule.classList.contains('hidden')) return;

        // Ctrl+A: select all rows
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            selectedRows.clear();
            segments.forEach((_, i) => selectedRows.add(i));
            renderTable();
        }

        // Delete / Backspace: delete selected
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedRows.size > 0 && document.activeElement === document.body) {
                e.preventDefault();
                deleteRows();
            }
        }

        // Escape: clear selection
        if (e.key === 'Escape') {
            selectedRows.clear();
            renderTable();
        }
    });
});
