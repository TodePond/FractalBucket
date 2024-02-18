/**
 * @type {{
 * 	device: GPUDevice,
 * 	context: GPUCanvasContext,
 * 	canvas: HTMLCanvasElement,
 * 	presentationFormat: GPUTextureFormat,
 * } | null}
 */
let cachedStage = null;

export async function getStage() {
  if (cachedStage) return cachedStage;
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) {
    alert("Browser doesn't support WebGPU");
    throw new Error("Browser doesn't support WebGPU");
  }
  const device = await adapter.requestDevice();
  if (!device) {
    alert("Browser doesn't support WebGPU");
    throw new Error("Browser doesn't support WebGPU");
  }

  const canvas = document.querySelector("canvas");
  if (!canvas) throw new Error("Can't get canvas");
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("Can't get context");

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format: presentationFormat });

  cachedStage = { device, context, canvas, presentationFormat };
  return cachedStage;
}
