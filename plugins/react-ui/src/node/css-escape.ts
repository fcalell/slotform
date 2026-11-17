// The CSS escape policy, a label over `@fcalell/cli/css`: docs/architecture/codegen.md, "CSS escape boundary".
import {
	cssIdent as cssIdentBase,
	cssString,
	cssSupportsExpression as cssSupportsExpressionBase,
	cssTokenValue as cssTokenValueBase,
	cssUrl as cssUrlBase,
	cssVarName as cssVarNameBase,
	isCssIdent,
	isCssSupportsExpression,
} from "@fcalell/cli/css";

const LABEL = "plugin-react-ui";

export { cssString, isCssIdent, isCssSupportsExpression };

export const cssUrl = (value: string): string => cssUrlBase(value, LABEL);
export const cssIdent = (value: string): string => cssIdentBase(value, LABEL);
export const cssSupportsExpression = (value: string): string =>
	cssSupportsExpressionBase(value, LABEL);
export const cssVarName = (value: string): string =>
	cssVarNameBase(value, LABEL);
export const cssTokenValue = (value: string): string =>
	cssTokenValueBase(value, LABEL);

// A declaration's property name: docs/architecture/codegen.md, "CSS escape boundary".
export const cssProperty = (value: string): string =>
	value.startsWith("--") ? cssVarName(value) : cssIdent(value);
