import { useEffect, useRef, type RefObject } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from "react-native";
import { createKeyboardScrollCoordinator } from "./keyboard-scroll";

type Props = ScrollViewProps & { avoidKeyboard?: boolean; scrollRef?: RefObject<ScrollView | null> };

export function KeyboardAwareScrollView({ children, onFocus, avoidKeyboard = true, scrollRef: externalRef,
  ...props }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const coordinatorRef = useRef<ReturnType<typeof createKeyboardScrollCoordinator> | null>(null);
  if (!coordinatorRef.current) coordinatorRef.current = createKeyboardScrollCoordinator(
    (target) => scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(target, 24, true),
    (callback) => { setTimeout(callback, 80); },
  );

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => coordinatorRef.current?.keyboardDidShow());
    const hidden = Keyboard.addListener("keyboardDidHide", () => coordinatorRef.current?.keyboardDidHide());
    return () => { shown.remove(); hidden.remove(); };
  }, []);

  const content = <ScrollView ref={(node) => { scrollRef.current = node; if (externalRef) externalRef.current = node; }}
    keyboardShouldPersistTaps="handled" {...props}
      onFocus={(event) => {
        coordinatorRef.current?.focus(event.nativeEvent.target);
        onFocus?.(event);
      }}>
      {children}
    </ScrollView>;
  return avoidKeyboard
    ? <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {content}
    </KeyboardAvoidingView>
    : content;
}
