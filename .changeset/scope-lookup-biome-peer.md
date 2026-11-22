---
"@slotform/auth": patch
"@slotform/biome-config": patch
---

`@slotform/auth/runtime` exports `ScopeLookup`, so an app using auth scopes emits the declarations of its generated `.slotform/worker.ts` and `.slotform/procedure.ts`. `@slotform/biome-config` names Biome `^2.6.8` as an optional peer, the release its `markdown` and `yaml` keys need.
