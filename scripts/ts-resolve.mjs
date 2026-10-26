// node --experimental-strip-types --import ./scripts/ts-resolve.mjs <test>
// Lets Node load app modules that import siblings without a file extension
// ("./satelliteCore"), as Metro and TypeScript allow.
import { registerHooks } from 'node:module';

registerHooks({
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
