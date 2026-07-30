// In the browser, js/*.js are loaded as plain <script> tags that share one
// global scope — customers.js, machine.js, and inventory.js reference
// INGREDIENTS/recetasHastaTier as bare identifiers without importing them.
// This setup replicates that shared scope for tests by putting recipes.js's
// exports onto globalThis before any dependent module is required.
const recipes = require('../js/recipes.js');
Object.assign(globalThis, recipes);

// Node 22+ ships its own experimental `localStorage` global (behind
// --localstorage-file, broken without it). Vitest's jsdom environment only
// copies window properties it doesn't already find on Node's global object,
// so Node's broken accessor wins and shadows jsdom's real Storage. The real
// one is still reachable via globalThis.jsdom (the raw JSDOM instance
// vitest stashes there) — force it back onto globalThis so save.js's bare
// `localStorage` reference resolves to a working Storage.
if (typeof globalThis.jsdom !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    get() { return globalThis.jsdom.window.localStorage; },
    configurable: true,
  });
}
