/** @type {GPUAdapter | null} */
let cachedAdapter = null;
export async function useAdapter() {
  if (cachedAdapter) return cachedAdapter;
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) {
    alert("Browser doesn't support WebGPU");
    throw new Error("Browser doesn't support WebGPU");
  }
  cachedAdapter = adapter;
  return adapter;
}
