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
    const qaControls = document.getElementById('qaControls');
    const mergeBtn = document.getElementById('mergeBtn');
    const splitBtn = document.getElementById('splitBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const insertBlankBtn = document.getElementById('insertBlankBtn');
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
    let sourceSegments = [];
    let targetSegments = [];
    let selectedSource = new Set();
    let selectedTarget = new Set();
    let lastClickedSource = null;
    let lastClickedTarget = null;

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
        sourceSegments = [];
        targetSegments = [];
        selectedSource.clear();
        selectedTarget.clear();
        lastClickedSource = null;
        lastClickedTarget = null;
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
            qaControls.classList.add('hidden');
        } else {
            alignView.classList.add('hidden');
            qaView.classList.remove('hidden');
            alignControls.classList.add('hidden');
            qaControls.classList.remove('hidden');
        }
    }

    // Submit / Process Input
    submitBtn.addEventListener('click', () => {
        const data = gatherInput();
        if (!data) return;
        const result = processInput(data);
        sourceSegments = result.source;
        targetSegments = result.target;
        selectedSource.clear();
        selectedTarget.clear();
        lastClickedSource = null;
        lastClickedTarget = null;
        showOutput();
    });

    function gatherInput() {
        const docName = docNameInput.value.trim() || 'Untitled';
        let srcText = '', trgText = '', bitext = '', srcUrl = '', trgUrl = '';

        switch (currentTab) {
            case 'source-target':
                srcText = srcTextInput.value.trim();
                trgText = trgTextInput.value.trim();
                // Allow empty input to trigger mock data (for demo purposes)
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
     */
    function processInput(data) {
        let source = [];
        let target = [];

        // If bitext tab, attempt to parse tab-separated pairs
        if (data.input_type === 'bitext' && data.bitext) {
            return parseBitext(data.bitext);
        }

        // If source-target tab with text, split by newlines and pair
        if (data.input_type === 'source-target' && (data.src_text || data.trg_text)) {
            source = data.src_text ? data.src_text.split(/\n+/).filter(l => l.trim()) : [];
            target = data.trg_text ? data.trg_text.split(/\n+/).filter(l => l.trim()) : [];
            if (source.length || target.length) {
                return { source, target };
            }
        }

        // fallback to mock data
        return getMockSegments();
    }

    function parseBitext(text) {
        const lines = text.split(/\n/).filter(l => l.trim());
        let source = [];
        let target = [];
        lines.forEach((line) => {
            const parts = line.split('\t');
            source.push((parts[0] || '').trim());
            target.push((parts[1] || '').trim());
        });
        return { source, target };
    }

    function getMockSegments() {
        return {
            source: [
                "The United Nations was founded in 1945.",
                "Its headquarters is in New York City.",
                "The organization promotes international cooperation.",
                "There are 193 member states.",
                "The General Assembly is the main deliberative organ.",
                "The Security Council handles peace and security.",
                "The Secretary-General is the chief administrative officer.",
                "Six official languages are used in its proceedings."
            ],
            target: [
                "تأسست الأمم المتحدة عام 1945.",
                "يقع مقرها الرئيسي في مدينة نيويورك.",
                "تعمل المنظمة على تعزيز التعاون الدولي.",
                "يبلغ عدد الدول الأعضاء 193 دولة.",
                "الجمعية العامة هي الجهاز التداولي الرئيسي.",
                "يتولى مجلس الأمن مسائل السلام والأمن.",
                "الأمين العام هو كبير الموظفين الإداريين.",
                "تُستخدم ست لغات رسمية في أعمالها."
            ]
        };
    }

    function isRTL(langCode) {
        return ['ar', 'he', 'fa', 'ur'].includes(langCode);
    }

    // Table Rendering
    function renderTable() {
        bitextTableBody.innerHTML = '';
        const maxLen = Math.max(sourceSegments.length, targetSegments.length);

        const trgDir = isRTL(trgLang.value) ? 'rtl' : 'ltr';
        const srcDir = isRTL(srcLang.value) ? 'rtl' : 'ltr';

        const headers = document.querySelectorAll('.bitext-table thead th');
        headers[1].setAttribute('dir', srcDir);
        headers[2].setAttribute('dir', trgDir);

        for (let i = 0; i < maxLen; i++) {
            const tr = document.createElement('tr');
            
            const numTd = document.createElement('td');
            numTd.textContent = i + 1;
            
            const srcTd = document.createElement('td');
            srcTd.setAttribute('dir', srcDir);
            let srcContent = sourceSegments[i] !== undefined ? escapeHtml(sourceSegments[i]) : '';
            srcTd.innerHTML = srcContent;
            if (selectedSource.has(i)) srcTd.classList.add('selected');
            srcTd.addEventListener('click', (e) => handleCellClick('source', i, e));

            const trgTd = document.createElement('td');
            trgTd.setAttribute('dir', trgDir);
            let trgContent = targetSegments[i] !== undefined ? escapeHtml(targetSegments[i]) : '';
            trgTd.innerHTML = trgContent;
            if (selectedTarget.has(i)) trgTd.classList.add('selected');
            trgTd.addEventListener('click', (e) => handleCellClick('target', i, e));

            tr.appendChild(numTd);
            tr.appendChild(srcTd);
            tr.appendChild(trgTd);
            bitextTableBody.appendChild(tr);
        }

        updateSelectionBadge();
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Cell Selection
    function handleCellClick(type, index, e) {
        const selectedSet = type === 'source' ? selectedSource : selectedTarget;
        const otherSet = type === 'source' ? selectedTarget : selectedSource;
        let lastClicked = type === 'source' ? lastClickedSource : lastClickedTarget;

        if (e.shiftKey && lastClicked !== null) {
            // Range select within the same column
            const start = Math.min(lastClicked, index);
            const end = Math.max(lastClicked, index);
            if (!e.ctrlKey && !e.metaKey) {
                selectedSet.clear();
            }
            for (let i = start; i <= end; i++) {
                selectedSet.add(i);
            }
        } else if (e.ctrlKey || e.metaKey) {
            // Toggle single cell
            if (selectedSet.has(index)) {
                selectedSet.delete(index);
            } else {
                selectedSet.add(index);
            }
        } else {
            // Single select. If selecting in one column without ctrl, clear both columns.
            selectedSource.clear();
            selectedTarget.clear();
            selectedSet.add(index);
        }

        if (type === 'source') {
            lastClickedSource = index;
        } else {
            lastClickedTarget = index;
        }

        renderTable();
    }

    function updateSelectionBadge() {
        const count = selectedSource.size + selectedTarget.size;
        if (count > 0) {
            selectionBadge.textContent = `${count} selected`;
            selectionBadge.classList.remove('hidden');
        } else {
            selectionBadge.classList.add('hidden');
        }
    }

    // Cell Operations
    mergeBtn.addEventListener('click', mergeCells);
    splitBtn.addEventListener('click', splitCells);
    deleteBtn.addEventListener('click', deleteCells);
    if(insertBlankBtn) insertBlankBtn.addEventListener('click', insertBlankCell);

    function mergeCells() {
        if (selectedSource.size < 2 && selectedTarget.size < 2) {
            showToast('Select at least 2 cells in the same column to merge.');
            return;
        }

        let mergedSource = false;
        let mergedTarget = false;

        // Helper function to handle merge per column
        const processMerge = (selectedSet, segmentsArray) => {
            if (selectedSet.size >= 2) {
                const indices = Array.from(selectedSet).sort((a, b) => a - b);
                for (let i = 1; i < indices.length; i++) {
                    if (indices[i] !== indices[i - 1] + 1) {
                        return { success: false, error: 'Can only merge contiguous cells.' };
                    }
                }
                const mergedText = indices.map(i => segmentsArray[i]).filter(Boolean).join(' ');
                segmentsArray[indices[0]] = mergedText;
                for (let i = indices.length - 1; i >= 1; i--) {
                    segmentsArray.splice(indices[i], 1);
                }
                selectedSet.clear();
                selectedSet.add(indices[0]);
                return { success: true, count: indices.length };
            }
            return { success: false, bypass: true };
        };

        const resSrc = processMerge(selectedSource, sourceSegments);
        const resTrg = processMerge(selectedTarget, targetSegments);

        if (resSrc.error) {
            showToast(`Source: ${resSrc.error}`);
            return;
        }
        if (resTrg.error) {
            showToast(`Target: ${resTrg.error}`);
            return;
        }

        if (resSrc.success) mergedSource = true;
        if (resTrg.success) mergedTarget = true;

        if (mergedSource || mergedTarget) {
            renderTable();
            showToast('Cells merged successfully.');
        }
    }

    function splitCells() {
        if (selectedSource.size > 1 || selectedTarget.size > 1 || (selectedSource.size === 0 && selectedTarget.size === 0)) {
            showToast('Select exactly 1 cell to split.');
            return;
        }

        let splitPerformed = false;

        const processSplit = (selectedSet, segmentsArray) => {
            if (selectedSet.size === 1) {
                const index = Array.from(selectedSet)[0];
                const text = segmentsArray[index];
                const parts = splitBySentence(text);
                
                if (parts.length < 2) {
                    return { success: false, error: 'No proper sentence boundary found to split on.' };
                }

                segmentsArray.splice(index, 1, ...parts);
                selectedSet.clear();
                return { success: true };
            }
            return { success: false, bypass: true };
        };

        const resSrc = processSplit(selectedSource, sourceSegments);
        const resTrg = processSplit(selectedTarget, targetSegments);

        if (resSrc.error) {
            showToast(`Source: ${resSrc.error}`);
            return;
        }
        if (resTrg.error) {
            showToast(`Target: ${resTrg.error}`);
            return;
        }

        if (resSrc.success || resTrg.success) splitPerformed = true;

        if (splitPerformed) {
            renderTable();
            showToast('Cell split successfully.');
        }
    }

    function splitBySentence(text) {
        if (!text) return [text];
        const parts = text.split(/(?<=[.!?؟。])\s+/);
        return parts.filter(p => p.trim());
    }

    function deleteCells() {
        if (selectedSource.size === 0 && selectedTarget.size === 0) {
            showToast('No cells selected.');
            return;
        }

        const count = selectedSource.size + selectedTarget.size;

        const deleteFrom = (selectedSet, segmentsArray) => {
            const indices = Array.from(selectedSet).sort((a, b) => b - a);
            indices.forEach(i => {
                if (i < segmentsArray.length) {
                    segmentsArray.splice(i, 1);
                }
            });
            selectedSet.clear();
        };

        deleteFrom(selectedSource, sourceSegments);
        deleteFrom(selectedTarget, targetSegments);

        renderTable();
        showToast(`Deleted ${count} cell(s).`);
    }

    function insertBlankCell() {
        if (selectedSource.size === 0 && selectedTarget.size === 0) {
            showToast('Select a cell to insert a blank row above it.');
            return;
        }

        const insertInto = (selectedSet, segmentsArray) => {
            // Insert above the first selected cell in the column
            if (selectedSet.size > 0) {
                const minIndex = Math.min(...Array.from(selectedSet));
                segmentsArray.splice(minIndex, 0, "");
                selectedSet.clear();
            }
        };

        insertInto(selectedSource, sourceSegments);
        insertInto(selectedTarget, targetSegments);

        renderTable();
        showToast('Blank cell inserted.');
    }


    // Export / Download
    exportBtn.addEventListener('click', exportTSV);
    downloadBtn.addEventListener('click', downloadProject);

    function exportTSV() {
        if (sourceSegments.length === 0 && targetSegments.length === 0) {
            showToast('No data to export.');
            return;
        }
        const sanitize = (str) => (str || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
        const header = 'Source\tTarget\n';
        
        const maxLen = Math.max(sourceSegments.length, targetSegments.length);
        let rows = '';
        for (let i = 0; i < maxLen; i++) {
            rows += `${sanitize(sourceSegments[i])}\t${sanitize(targetSegments[i])}\n`;
        }

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
            source_segments: sourceSegments,
            target_segments: targetSegments,
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
        if (outputModule.classList.contains('hidden')) return;

        // Ctrl+A: select all cells
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            selectedSource.clear();
            selectedTarget.clear();
            sourceSegments.forEach((_, i) => selectedSource.add(i));
            targetSegments.forEach((_, i) => selectedTarget.add(i));
            renderTable();
        }

        // Delete / Backspace: delete selected
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if ((selectedSource.size > 0 || selectedTarget.size > 0) && document.activeElement === document.body) {
                e.preventDefault();
                deleteCells();
            }
        }

        // Escape: clear selection
        if (e.key === 'Escape') {
            selectedSource.clear();
            selectedTarget.clear();
            renderTable();
        }
    });
});
