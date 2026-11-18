// A captured page, inline so the scene needs no asset pipeline.
export const SCREEN = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800"><rect width="1280" height="800" fill="#f4f6f8"/><rect width="1280" height="64" fill="#2f3a45"/><rect x="32" y="20" width="160" height="24" rx="4" fill="#9fb7c9"/><rect x="64" y="128" width="520" height="40" rx="6" fill="#2f3a45"/><rect x="64" y="192" width="640" height="20" rx="4" fill="#9aa5b1"/><rect x="64" y="228" width="580" height="20" rx="4" fill="#9aa5b1"/><rect x="64" y="288" width="168" height="48" rx="8" fill="#5f7d93"/><rect x="720" y="128" width="496" height="360" rx="12" fill="#dde3e9"/><rect x="752" y="160" width="432" height="144" rx="8" fill="#9fb7c9"/><rect x="752" y="328" width="280" height="24" rx="4" fill="#9aa5b1"/><rect x="752" y="368" width="360" height="24" rx="4" fill="#9aa5b1"/><rect x="64" y="560" width="1152" height="176" rx="12" fill="#dde3e9"/></svg>',
)}`;
// An address that is no picture, so the load fails.
export const BROKEN = "data:image/png;base64,AAAA";
