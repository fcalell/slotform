# Pictures and codes

Which component draws a picture, several pictures or a code a camera reads. The props of `Image`,
`Gallery`, `QrCode` and `Code` are each platform's blocks page
(`node_modules/@slotform/react-ui/guide/blocks.md`, `node_modules/@slotform/native-ui/guide/blocks.md`).

## Pictures side by side are a `Gallery`

More than one picture of the same thing (a change's screenshots, a page at each width) is a
`Gallery`, never a column of `Image`s nor a grid of your own. A single picture stays an `Image`.

## A code a camera reads is a `QrCode`

A code another device scans is a `QrCode`, never a picture of one. It takes no press, so the address
it carries stands beside it as a `Code` with `copy`, the way in for a device with no camera.

```tsx
const invite = orpc.devices.invite.read();

<QrCode value={invite.at((i) => i.url)} label="Code that adds a device" />
<Code text={invite.at((i) => i.url)} copy />
```
