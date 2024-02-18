import { useAdapter } from "./useAdapter.js";
import { useCanvas } from "./useCanvas.js";
import { useContext } from "./useContext.js";
import { useDevice } from "./useDevice.js";
import { useFormat } from "./useFormat.js";

/**
 * @type {{
 * 	device: GPUDevice,
 * 	context: GPUCanvasContext,
 * 	canvas: HTMLCanvasElement,
 * 	format: GPUTextureFormat,
 * } | null}
 */
let cachedStage = null;

export async function useStage() {
  if (cachedStage) return cachedStage;
  const device = await useDevice();

  const canvas = useCanvas();
  const context = useContext();
  const format = useFormat();
  context.configure({ device, format });

  cachedStage = { device, context, canvas, format };
  return cachedStage;
}
