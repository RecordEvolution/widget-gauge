# Copilot Instructions for widget-gauge

## Architecture Overview

IronFlock widget: Lit 3.x web component rendering ECharts gauge charts. Part of a multi-widget ecosystem (`widget-*` repos) sharing identical patterns.

**Key files:**
- `src/widget-gauge.ts` - Main LitElement component
- `src/definition-schema.json` - JSON Schema → auto-generates dashboard forms
- `src/definition-schema.d.ts` - Generated types (never edit manually)
- `demo/index.html` - Dev harness with auto-randomizing test data

## Critical: Version-Tagged Custom Elements

Source uses `versionplaceholder` replaced at build time via `@rollup/plugin-replace` in `vite.config.ts`:
```typescript
@customElement('widget-gauge-versionplaceholder')  // Becomes: widget-gauge-1.7.28
```
**Never hardcode versions** - the demo imports `package.json` to construct the tag dynamically.

## Schema-Driven Development

The dashboard auto-generates config UI from `definition-schema.json`. Custom extensions:
- `"type": "color"` → color picker
- `"order": N` → field ordering  
- `"dataDrivenDisabled": true` → field cannot be data-bound from IoT sources
- `"condition": { "relativePath": "../field", "showIfValueIn": [values] }` → conditional visibility

**Workflow:** Edit schema → `npm run types` → import generated types in component.

## Component API (universal across all widgets)

```typescript
@property({ type: Object }) inputData?: GaugeChartConfiguration  // From schema
@property({ type: Object }) theme?: { theme_name: string, theme_object: any }
```

Theme files in `demo/themes/` (light.json, chalk.json, vintage.json) for testing.

## ECharts: Modular Imports Required

Always use tree-shaken imports to minimize bundle (~625KB with ECharts):
```typescript
import * as echarts from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([GaugeChart, CanvasRenderer])
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run start` | Dev server at localhost:8000/demo/ |
| `npm run build` | Production build to dist/ |
| `npm run types` | Regenerate types from schema (run after schema changes) |
| `npm run release` | Build → bump patch → git push → tag |
| `npm run link` | Link to local RESWARM/frontend for integration testing |

## Build Config Notes (vite.config.ts)

- `process.env.NODE_ENV` must be `'production'` for ECharts optimization
- `tslib` alias needed: `tslib: 'tslib/tslib.es6.js'`

## Platform Registration (post-release)

```sql
select swarm.f_update_widget_master('{"package_name": "widget-gauge", "version": "X.Y.Z"}'::jsonb);
```

## Testing Tips

In `demo/index.html`, modify `keyPathsToRandomize` array to auto-test specific data paths every second.
