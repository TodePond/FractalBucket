import { useBuffer } from "./useBuffer.js";
import { useDevice } from "./useDevice.js";
import { useRenderPipeline } from "./useRenderPipeline.js";

/** @type {GPUBindGroup | null} */
let cached = null;

export async function useBindGroup() {
  if (cached) return cached;
  const bindGroup = await getBindGroup();
  cached = bindGroup;
  return cached;
}

async function getBindGroup() {
  const device = await useDevice();
  const pipeline = await useRenderPipeline();
  const buffer = await useBuffer();

  const bindGroup = device.createBindGroup({
    label: "uniform bind group ping",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: buffer.canvas.buffer } },
      { binding: 1, resource: { buffer: buffer.clock.buffer } },
      { binding: 2, resource: { buffer: buffer.pointer.buffer } },
      { binding: 3, resource: { buffer: buffer.elements.buffer } },
      { binding: 4, resource: { buffer: buffer.paints.buffer } },
    ],
  });

  cached = bindGroup;
  return bindGroup;
}
