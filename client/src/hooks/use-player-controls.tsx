import { useCallback } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../lib/stores/useControls";

export function usePlayerControls() {
  const [, get] = useKeyboardControls<Controls>();
  return useCallback(() => get(), [get]);
}
