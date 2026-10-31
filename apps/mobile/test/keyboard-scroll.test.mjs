import assert from "node:assert/strict";
import test from "node:test";
import { createKeyboardScrollCoordinator } from "../src/components/keyboard-scroll.ts";

test("focused input scrolls after keyboard opens and when focus moves while it stays open", () => {
  const pending = [];
  const scrolled = [];
  const coordinator = createKeyboardScrollCoordinator((target) => scrolled.push(target),
    (callback) => pending.push(callback));
  coordinator.focus(101);
  assert.deepEqual(scrolled, []);
  coordinator.keyboardDidShow();
  pending.shift()();
  assert.deepEqual(scrolled, [101]);
  coordinator.focus(202);
  pending.shift()();
  assert.deepEqual(scrolled, [101, 202]);
  coordinator.keyboardDidHide();
  coordinator.focus(303);
  assert.deepEqual(scrolled, [101, 202]);
});
