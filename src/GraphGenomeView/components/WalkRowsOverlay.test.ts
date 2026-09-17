import { agreesWithCall } from './WalkRowsOverlay'

test('a walk agrees with a call within 10%, or 100 bp when short', () => {
  expect(agreesWithCall(3183, [387, 3161])).toBe(true)
  expect(agreesWithCall(5525, [491, 491])).toBe(false)
  expect(agreesWithCall(493, [491, 491])).toBe(true)
  expect(agreesWithCall(450, [388])).toBe(true)
  expect(agreesWithCall(1642, [2640, 2640])).toBe(false)
})
