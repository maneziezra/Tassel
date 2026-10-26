// node --experimental-strip-types scripts/sw_has.mjs "key one" "key two" ...
// Prints which strings have no Kiswahili entry in lib/sw.ts (any quote style).
import { SW } from '../lib/sw.ts';

const missing = process.argv.slice(2).filter((k) => SW[k] === undefined);
console.log(missing.length ? `MISSING ${missing.length}:\n` + missing.join('\n') : 'all present');
process.exit(missing.length ? 1 : 0);
