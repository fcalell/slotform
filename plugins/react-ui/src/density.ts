import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";

// The density rule, one query for the layer, `touch:` and `useTouch`: docs/architecture/plugins/react-ui.md, "Density".
export const DESKTOP_MEDIA = `(pointer: fine) and (width >= ${BREAKPOINT_PX.tablet}px)`;
export const TOUCH_MEDIA = `not (${DESKTOP_MEDIA})`;

// The room set draws under the attribute, on the root as a pin or on the
// `Place` that declares its `distance`: no query detects the viewing distance.
export const ROOM_SCOPE = '[data-density="room"]';
