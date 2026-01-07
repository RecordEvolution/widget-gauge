# Copilot Instructions for widget-gauge

## Project Overview

Lit-based web component rendering ECharts gauge charts for the IronFlock IoT dashboard platform. Part of a multi-widget ecosystem where each widget follows identical patterns.

## Tech Stack & Architecture

- **Framework**: Lit 3.x (LitElement web components)
- **Charting**: ECharts 6.x with modular/tree-shaken imports
- **Build**: Vite 7.x for dev server and production builds
- **Types**: TypeScript 5.x + JSON Schema → TypeScript codegen

### File Structure Pattern (consistent across all widgets)

```
src/
├── widget-gauge.ts        # Main LitElement component
├── definition-schema.json # JSON Schema defining inputData structure
├── definition-schema.d.ts # Generated types (run: npm run types)
└── default-data.json      # Sample data for development
demo/
└── index.html             # Development test harness
```

## Critical Conventions

### Version-Tagged Custom Elements

The custom element tag includes the version: `widget-gauge-{version}`. The placeholder `versionplaceholder` in source code is replaced at build time via Rollup's replace plugin.

```typescript
// Source code uses placeholder
@customElement('widget-gauge-versionplaceholder')

// After build becomes: widget-gauge-1.7.28
```

### Data Schema Workflow

1. Edit `src/definition-schema.json` to change widget configuration
2. Run `npm run types` to regenerate `definition-schema.d.ts`
3. Import and use types in the component

The JSON Schema uses custom extensions:

- `"type": "color"` → renders color picker in dashboard
- `"order": N` → field ordering in auto-generated forms
- `"dataDrivenDisabled": true` → field cannot be data-bound
- `"condition"` → conditional field visibility

### Component API Pattern

All widgets expose two main properties:

```typescript
@property({ type: Object }) inputData?: GaugeChartConfiguration  // From schema
@property({ type: Object }) theme?: { theme_name: string, theme_object: any }
```

### ECharts Integration

Use modular imports for tree-shaking:

```typescript
import * as echarts from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([GaugeChart, CanvasRenderer])
```

## Development Workflow

```bash
npm run start    # Dev server at localhost:8000/demo/
npm run build    # Production build to dist/
npm run types    # Regenerate TS types from JSON schema
npm run release  # Build + bump patch version + push + tag
npm run link     # Link for local dev with RESWARM/frontend
```

## Build Configuration Notes

- `process.env.NODE_ENV` must be defined for ECharts production mode
- `tslib` alias required for ESM compatibility: `tslib: 'tslib/tslib.es6.js'`
- Bundle size ~625KB (ECharts core + zrender is ~450KB)

## Platform Integration

After releasing, register new version with IronFlock:

```sql
select swarm.f_update_widget_master('{"package_name": "widget-gauge", "version": "X.Y.Z"}'::jsonb);
```

## Testing Changes

The demo page at `/demo/index.html` auto-randomizes data values for testing. Modify `keyPathsToRandomize` array to test specific properties.
