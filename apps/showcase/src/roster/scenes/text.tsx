import { Text } from "@slotform/react-ui/components/text";
import type { ShowcaseScene } from "../class-sets.ts";

// Code in a sentence at 320: docs/architecture/ui-core/words.md, "Text runs".
const CODED = [
	"Type it as ",
	{ code: "ha.lan:8123" },
	" or ",
	{ code: "http://ha.lan:8123" },
	". Compare each fingerprint with what the machine shows (",
	{ code: "ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub" },
	").",
];

// Each class set draws the component in that role, two sentences long so its
// paragraph runs to the measure, which both roles hold at one width. The body
// draws a sentence of code runs under it.
export function drawText(scene: ShowcaseScene) {
	switch (scene.classSet.name) {
		case "TEXT.role.body":
			return (
				<>
					<Text kind="body">
						A primary line, the body of a paragraph. It runs on past one line,
						so the scene shows where the measure ends and the paragraph wraps.
					</Text>
					<Text kind="body">{CODED}</Text>
				</>
			);
		case "TEXT.role.meta":
			return (
				<Text kind="meta">
					A secondary line that describes the one above. It runs on past one
					line, to the same width as a primary line does.
				</Text>
			);
		default:
			return undefined;
	}
}
