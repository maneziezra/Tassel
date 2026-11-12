// node --experimental-strip-types --import ./scripts/ts-resolve.mjs <test>
// Lets Node load app modules that import siblings without a file extension
// ("./satelliteCore"), as Metro and TypeScript allow, and import JSON files without
// `with { type: 'json' }` (lib/diseases.ts imports the model's class_labels.json).
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, next) {
    if (url.startsWith('file:') && url.endsWith('.json') && !context.importAttributes?.type) {
      return { format: 'module', source: `export default ${readFileSync(new URL(url), 'utf8')};`, shortCircuit: true };
    }
    return next(url, context);
  },
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' && /^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        return next(`${specifier}.ts`, context);
      }
      throw err;
    }
  },
});
