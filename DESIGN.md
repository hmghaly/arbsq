# ARBSQ interface direction

ARBSQ is a collection of tools for language learning and processing, with a focus
on Arabic. The landing page should help a translator or researcher find a working
tool quickly and understand what is still in development.

This is the starting direction for the tools directory and footer. It extends the
existing identity rather than introducing a different brand on the landing page.

## Palette and typography

| Role | Value | Use |
| --- | --- | --- |
| Paper | `#FFFDF5` | Main reading surface, inherited from the current site |
| Ink | `#2C1810` | Headings and footer background |
| Secondary text | `#795035` | Descriptions and supporting labels |
| Divider | `#DFD1BB` | Separate tools and navigation groups |
| Accent | `#886109` | Working links, selected filters, and focus |
| Footer text | `#FFF8E1` | Readable text against the dark background |

Keep Amiri for the ARBSQ wordmark and section headings: it connects Latin text to
the existing Arabic calligraphy identity. Keep Inter for tool names, descriptions,
and controls so the transition into the existing workspaces stays familiar.
Use sentence case and normal tracking. Descriptions should stay below 55–60
characters per line where space permits.

## Tools directory

```text
Tools                       What the tools help you do
All tools   Translation   Arabic   NLP   …

XL8              Document translation workflow         Open XL8
Canvas           Parallel sentence alignment          Open Canvas
Country names    Country translation and sorting      Open country names

In development                             8 tools  +
```

Tool names, the task they support, and the destination do the work. Each available
tool has a custom solid icon: two documents with different writing for XL8,
connected facing pages for Canvas, and a flag with sorted entries for Country
names. Use ink silhouettes, muted gold (`#B98A2D`), and paper cutouts; keep the
icons unframed and compact. Outlined launch cues distinguish actions from prose.
Avoid large icon tiles, repeated category pills, lifted cards, gradients, or
entrance effects.
Rows share one reading surface; dividers separate destinations without making
each one a separate box. The whole available-tool row is a real link.

Keep subject filters because the directory includes both published and future
work. Filter both groups, announce the available count, and show matching future
work automatically when a subject is selected. Provide an honest empty state
when a subject has no available tool.

Available and future tools have different emphasis. The three current tools lead;
the eight unfinished tools sit in a native disclosure. The parser's previous
`href="#"` is not a usable destination, so it belongs in the unfinished group.
Do not promise a release date or make unfinished entries look clickable.

On narrow screens, the description and action stack under the tool name. Filters
wrap instead of overflowing; disclosures, filters, and links work from a keyboard.

## Footer

Use the same ink color as the rest of the identity. Its geometric SVG pattern
refers to the existing arabesque motif; it sits quietly on the right, behind the
navigation. This is the one patterned element in this pass, and it remains sharp
at any display density. Do not stretch the 45-pixel navigation JPEG into a footer.

The footer links to actual sections and the project's GitHub repository. Remove
placeholder social destinations and the subscription form that only simulated a
successful subscription. Restore either only when it has a working destination
or integration. Keep the existing attribution.

## Interaction and implementation

- Use local, scoped CSS for this pass; keep the existing static HTML architecture.
- Use named HTML handlers for new controls, consistent with the XL8 conventions.
- No hidden-on-load content or new animation. Respect reduced-motion preferences.
- Show visible focus and maintain readable contrast in both light and dark areas.
- No new framework, icon library, raster artwork, or runtime dependency is needed.
