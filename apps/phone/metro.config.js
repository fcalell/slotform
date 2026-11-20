// Configure Metro through slotform.config.ts; this shim re-exports the generated config:
// docs/architecture/plugins/expo.md, "Config files are .cjs".
module.exports = require("./.slotform/metro.config.cjs");
