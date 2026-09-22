# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run start` | Vite dev server at http://localhost:8000/demo/ (also runs `vite build --watch` in parallel) |
| `npm run build` | Production lib build to `dist/widget-gauge.js` |
| `npm run watch` | Build in watch mode only |
| `npm run types` | Regenerate `src/definition-schema.d.ts` from `src/definition-schema.json` (run after any schema edit) |
| `npm run analyze` | Regenerate `custom-elements.json` via `cem analyze --litelement` |
| `npm run release` | `npm version patch`: preflight guards (on `main`, clean tree, not behind `origin/main`, generated files current, build passes) → commit + bare-semver tag → `git push --follow-tags` → waits on the CI publish. Also `release:minor` / `release:major`. |
| `npm run link` / `unlink` | Symlink the built package into `../RESWARM/frontend` for integration testing |

No test runner or linter is configured. Node `>=24.9.0`, npm `>=10.0.2`.

## Architecture

This is one widget in a multi-repo IronFlock widget ecosystem (sibling `widget-*` repos share identical patterns). It's a single Lit 3 web component wrapping an ECharts gauge.

**Entry point:** `src/widget-gauge.ts` defines `WidgetGauge extends LitElement` and registers it as `widget-gauge-versionplaceholder`. The `versionplaceholder` token is replaced at build time with `pkg.version` by `@rollup/plugin-replace` (see `vite.config.ts`). This produces a version-tagged custom element name (e.g. `widget-gauge-1.7.30`) so multiple versions can coexist on a dashboard. **Never hardcode the version** — the demo reads `package.json` to construct the tag dynamically.

**Component contract** (universal across all IronFlock widgets):
- `@property({ type: Object }) inputData?: GaugeChartConfiguration` — config matching the schema
- `@property({ type: Object }) theme?: { theme_name: string, theme_object: any }` — theme objects in `demo/themes/` (light/chalk/vintage)

Theming: `registerTheme()` resolves colours as a `var(--re-text-color, <theme value>)` / `var(--re-tile-background-color, <theme value>)` chain rather than reading the host's custom properties through `getComputedStyle`. The host property still wins over `theme_object`, but nothing is snapshotted, so a board style edit repaints the tile live. ECharts cannot resolve a `var()` chain (it paints to a canvas), so the few canvas colours go through `resolvedTextColor()`, which reads the property at the point of use.


**Schema-driven config UI:** `src/definition-schema.json` is JSON Schema with IronFlock extensions; the dashboard auto-generates the config form from it. Custom keywords:
- `"type": "color"` -> color picker
- `"order": N` -> field ordering in the form
- `"dataDrivenDisabled": true` -> field cannot be bound to live IoT data
- `"condition": { "relativePath": "../field", "showIfValueIn": [...] }` -> conditional visibility

Workflow: edit `definition-schema.json` -> `npm run types` -> import the regenerated types from `./definition-schema.js` in `widget-gauge.ts`. Never edit `definition-schema.d.ts` by hand.

**Build pipeline (`vite.config.ts`):**
- Library build, ES format only, entry `src/widget-gauge.ts`
- `echarts` is `external` (peerDependency) — consumers provide it
- `process.env.NODE_ENV` is forced to `'production'` so ECharts ships its optimized path
- `tslib` aliased to `tslib/tslib.es6.js`
- ECharts must be imported modularly (`echarts/core` + specific charts/renderers via `echarts.use(...)`) to keep the bundle small

**Demo harness (`demo/index.html`):** imports the source TS directly and constructs the versioned tag from `package.json`. It uses `ObjectRandomizer.js` (loaded via CDN) plus `keyPathsToRandomize` to mutate `inputData` once per second — useful for visually testing reactivity. Adjust the array to exercise specific data paths.

## Release & Platform Registration

`npm run release` bumps the patch version, pushes the tag, and a GitHub Action publishes to npm. Then notify the IronFlock platform with the new version:

```sql
select swarm.f_update_widget_master('{"package_name": "widget-gauge", "version": "X.Y.Z"}'::jsonb);
```

For local platform testing, `npm run build` first so the version baked into the bundle matches, then restart the node web server container. If the widget is referenced in `dashboard-template.yml`, update the version there too.

## `aiSelection` in `src/definition-schema.json`

The schema root carries an `aiSelection` block next to `title` and `description`. It is **not** JSON Schema and describes no config field — it exists so the IronFlock AI's Widget Builder can pick the right widget for a given shape of data, using knowledge only the widget author has:

```jsonc
"aiSelection": {
  "dataShape": "…what columns this widget consumes and what each one means…",
  "useWhen":   ["…a situation, naming the properties that express it…"],
  "notFor":    ["…a situation this widget is wrong for, naming the widget to use instead…"]
}
```

It is inert everywhere else, and must stay that way: `json2ts` ignores it (the generated `.d.ts` is byte-identical with and without it), the dashboard config editor renders only `schema.properties`, and the AI service's `validate_widget` validates *configs* against the schema, skipping unknown Draft-7 keywords.

When maintaining it:

- `notFor` is the high-value half and the part plain descriptions always omit. Every entry must name the widget that *should* be used, or it rejects without routing.
- Write for an LLM with no other documentation: describe the visible result and the user's intent, not the implementation.
- Prefer entries that discriminate against a *neighbouring* widget. Generic rejections are cheap; the ones that pay are those an author could plausibly get wrong.
- The `notFor` lists are a set across all `widget-*` repos and are meant to be reciprocal — if this widget routes to another for some case, that widget should usually route back for the converse. Changing one side is a cue to check the other.
- Update it whenever a property changes what this widget can *do*, not just how it looks.
