# XL8 functions and backend integration

XL8 uses plain HTML and JavaScript modules. Controls call named functions in their
HTML attributes, for example `onclick="create_project()"` and
`oninput="update_draft(this.value)"`. Form submission goes through
`submit_project(event)` so pressing Enter also works. Dynamic sentence buttons
receive the same explicit attributes when the table is rendered.

Source sentences and saved target sentences are selectable text. Use the separate
Translate/Edit button to open a target editor; selecting or copying document text
does not activate editing or discard a draft.

## Where to work

| File | Responsibility |
| --- | --- |
| `index.html` | Project input form and its handler attributes |
| `dashboard.html` | Saved-project list |
| `editor.html` | Translation table, dialogs, and handler attributes |
| `../../assets/js/xl8.js` | Top-level UI handlers and workflow orchestration |
| `../../assets/js/xl8-text.js` | Text splitting, sentence normalization, TXT export |
| `../../assets/js/xl8-projects.js` | Project JSON, async storage functions, legacy storage compatibility |
| `../../assets/js/site-nav.js` | Shared navigation and its named handlers |

## Main calls

| Function | Input | Output |
| --- | --- | --- |
| `read_project_input()` | Current form fields | Promise of source text and project settings |
| `split_text(text, project_info)` | Source text and settings including `sourceLanguage`, `documentId` | Sentence-pair array; callers also accept a promise |
| `create_project()` | Current form | Promise of save result, or `null` after displaying an error; opens the saved project |
| `upload_project(project_info)` | Project JSON | Promise of `{ project, confirmation: { saved: true, project_id } }` |
| `load_project(translation_id)` | Project ID | Promise of project JSON, or `null` if missing |
| `list_projects()` | None | Promise of project JSON array |
| `deploy_translation(translation_id)` | Project ID | Promise of loaded project or `null`; renders the workspace |
| `deploy_translation_table(text_items, project_info)` | Sentence pairs and project context | Rendered table body; selects the displayed project in UI state |

The page exposes these calls on `window` because module functions otherwise cannot
be called from inline HTML. `create_project()` calls `window.split_text()` and
`window.upload_project()`. Loading and saving edits similarly call the public
storage functions. A splitter can therefore be synchronous or asynchronous.

Text utilities and storage functions are also exported from their modules for
reuse without the UI. The storage functions accept an optional second `storage`
argument (first argument for `list_projects`) for testing; browser use defaults to
`localStorage`.

## Sentence records

```javascript
{
  id: "segment-001",
  src_id: "src-001",
  src_text: "The new mandate",
  trg_id: "trg-001",
  trg_text: "",
  translations: [
    { model: "gpt", text: "اقتراح أول" },
    { model: "deepseek", text: "اقتراح ثانٍ" }
  ],
  separator: "",
  // Extra JSON metadata is preserved when editing and saving.
  paragraph: 1
}
```

`id` identifies the pair; `src_id` and `trg_id` become the table cell IDs. Preserve
all three when saving or loading a project. IDs must be unique within a document;
pair IDs use letters, numbers, underscores, periods, colons, or hyphens. Cell IDs
must be nonempty and contain no whitespace. A missing pair ID defaults to
`src_id`, and missing cell IDs are generated. `translations` defaults to `[]`.

`separator` contains whitespace before a pair in TXT exports. If omitted, it
defaults to an empty string for the first pair and one space for following pairs.
Supply `"\n"` or `"\n\n"` to preserve line/paragraph boundaries. The default splitter
preserves these boundaries. Exports contain target text only.

Records live in `project.documents[0].segments`. A project also contains `version:
1`, `id`, `name`, `sourceLanguage`, `targetLanguage`, `model`, `prompt`, `createdAt`,
`updatedAt`, and one document with `id`, `name`, and `originalText`. Use
`createProject(settings, text_items)` to build a project and `normalize_project()`
to obtain the public sentence shape.

## Connecting a backend

The simplest permanent integration is to replace the bodies of `split_text`,
`upload_project`, `load_project`, and `list_projects` in their existing modules.
Keep their contracts above and map backend field names inside those functions.
Check HTTP success and return `confirmation.saved: true` only after a successful
save. Failed requests should throw an `Error` so the page can display it without
discarding the user's draft.

For example, `split_text` can become:

```javascript
export async function split_text(text, project_info) {
    const response = await fetch('/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, project_info })
    });
    if (!response.ok) throw new Error('Text splitting failed. Please try again.');
    const result = await response.json();
    return normalize_text_items(result.items, project_info.documentId);
}
```

Existing saved pairs are reused without splitting again. If a backend returns a
document without `segments`, `deploy_translation()` requests splitting before
rendering it. Translation options returned with each sentence are shown in the
resources dialog. Otherwise, only the existing, clearly labeled sample options
are shown; no model requests are made.

The local adapter keeps its original `arbsq.xl8.projects.v1` storage key and raw
`source`/`target` fields for compatibility. Public load/save results expose
`src_text`/`trg_text`; extra metadata survives the conversion. Old projects retain
their original IDs and translations.

There is no application text or TXT file-size cap. Browser storage quotas and
rendering capacity still apply; failed saves leave the previous stored data
untouched. TXT input must be UTF-8. DOCX/PDF import is not included.

Run the storage/text checks with `node tests/xl8.test.mjs` from the repository root.
