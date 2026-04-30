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
| `npm run release` | `build` -> `npm version patch` -> `git push --tag` -> `build` again. Also see README for the post-release SQL step. |
| `npm run link` / `unlink` | Symlink the built package into `../RESWARM/frontend` for integration testing |

No test runner or linter is configured. Node `>=24.9.0`, npm `>=10.0.2`.

## Architecture

This is one widget in a multi-repo IronFlock widget ecosystem (sibling `widget-*` repos share identical patterns). It's a single Lit 3 web component wrapping an ECharts gauge.

**Entry point:** `src/widget-gauge.ts` defines `WidgetGauge extends LitElement` and registers it as `widget-gauge-versionplaceholder`. The `versionplaceholder` token is replaced at build time with `pkg.version` by `@rollup/plugin-replace` (see `vite.config.ts`). This produces a version-tagged custom element name (e.g. `widget-gauge-1.7.30`) so multiple versions can coexist on a dashboard. **Never hardcode the version** — the demo reads `package.json` to construct the tag dynamically.

**Component contract** (universal across all IronFlock widgets):
- `@property({ type: Object }) inputData?: GaugeChartConfiguration` — config matching the schema
- `@property({ type: Object }) theme?: { theme_name: string, theme_object: any }` — theme objects in `demo/themes/` (light/chalk/vintage)

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
