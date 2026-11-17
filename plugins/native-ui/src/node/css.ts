// CSS escaping for the native-ui `global.css` codegen: docs/architecture/codegen.md, "CSS escape boundary".
import {
	cssIdent as cssIdentBase,
	cssString,
	cssTokenValue as cssTokenValueBase,
	cssVarName as cssVarNameBase,
} from "@fcalell/cli/css";

const LABEL = "plugin-native-ui";

export { cssString };

export const cssIdent = (value: string): string => cssIdentBase(value, LABEL);
export const cssVarName = (value: string): string =>
	cssVarNameBase(value, LABEL);
export const cssTokenValue = (value: string): string =>
	cssTokenValueBase(value, LABEL);
