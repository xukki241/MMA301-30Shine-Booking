export function createKeyboardScrollCoordinator(
  scroll: (target: number) => void,
  schedule: (callback: () => void) => void,
) {
  let focusedTarget: number | null = null;
  let keyboardVisible = false;
  let active = true;
  const bringFocusedInputIntoView = () => schedule(() => {
    if (active && keyboardVisible && focusedTarget !== null) scroll(focusedTarget);
  });
  return {
    focus(target: number) {
      focusedTarget = target;
      if (keyboardVisible) bringFocusedInputIntoView();
    },
    keyboardDidShow() {
      keyboardVisible = true;
      if (focusedTarget !== null) bringFocusedInputIntoView();
    },
    keyboardDidHide() { keyboardVisible = false; },
    dispose() { active = false; },
  };
}
