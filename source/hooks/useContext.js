import { useCanvas } from "./useCanvas.js";

let cached = null;

export function useContext() {
  if (cached) return cached;
  const canvas = useCanvas();
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("Can't get WebGPU context");
  cached = context;
  return cached;
}
