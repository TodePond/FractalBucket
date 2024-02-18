import { useAdapter } from "./useAdapter.js";

/** @type {GPUDevice | null} */
let cachedDevice = null;
export async function useDevice() {
  if (cachedDevice) return cachedDevice;
  const adapter = await useAdapter();
  const device = await adapter.requestDevice();
  if (!device) {
    alert("Browser doesn't support WebGPU");
    throw new Error("Browser doesn't support WebGPU");
  }
  cachedDevice = device;
  return device;
}
