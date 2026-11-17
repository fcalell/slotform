// The style channels no component takes, declared `?: never` on every props type: docs/architecture/plugins/native-ui.md, "Components".
export interface Closed {
	class?: never;
	className?: never;
	classList?: never;
	style?: never;
	colorClassName?: never;
	selectionColorClassName?: never;
	selectionHandleColorClassName?: never;
	placeholderTextColorClassName?: never;
	cursorColorClassName?: never;
	underlineColorAndroidClassName?: never;
}
