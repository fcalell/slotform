// Configure Metro through stack.config.ts; this shim re-exports the generated config:
// docs/architecture/plugins/expo.md, "Config files are .cjs".
module.exports = require("./.stack/metro.config.cjs");
