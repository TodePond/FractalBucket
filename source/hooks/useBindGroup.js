import { useBuffer } from "./useBuffer.js";
import { useDevice } from "./useDevice.js";
import { usePipeline } from "./usePipeline.js";

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
  const pipeline = await usePipeline();
  const buffer = await useBuffer();

  const bindGroup = device.createBindGroup({
    label: "uniform bind group ping",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: buffer.canvas.buffer } },
      { binding: 1, resource: { buffer: buffer.clock.buffer } },
      { binding: 2, resource: { buffer: buffer.pointer.buffer } },
    ],
  });

  cached = bindGroup;
  return bindGroup;
}
