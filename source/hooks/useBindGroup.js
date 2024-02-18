import { useBuffer } from "./useBuffer.js";
import { useDevice } from "./useDevice.js";
import { usePipeline } from "./usePipeline.js";

/** @type {ReturnType<typeof getBindGroup> | null} */
let cached = null;

export async function useBindGroup() {
  if (cached) return cached;
  const bindGroup = getBindGroup();
  cached = bindGroup;
  return cached;
}

async function getBindGroup() {
  const device = await useDevice();
  const pipeline = await usePipeline();
  const {
    canvas: { buffer: canvasUniformBuffer },
    clock: { buffer: clockUniformBuffer },
    pointer: { buffer: pointerUniformBuffer },
    cellsPing: { buffer: cellsPingStorageBuffer },
    cellsPong: { buffer: cellsPongStorageBuffer },
  } = await useBuffer();

  const bindGroupPing = device.createBindGroup({
    label: "uniform bind group ping",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: canvasUniformBuffer } },
      { binding: 1, resource: { buffer: clockUniformBuffer } },
      { binding: 2, resource: { buffer: pointerUniformBuffer } },
      { binding: 3, resource: { buffer: cellsPingStorageBuffer } },
      { binding: 4, resource: { buffer: cellsPongStorageBuffer } },
    ],
  });

  const bindGroupPong = device.createBindGroup({
    label: "uniform bind group pong",
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: canvasUniformBuffer } },
      { binding: 1, resource: { buffer: clockUniformBuffer } },
      { binding: 2, resource: { buffer: pointerUniformBuffer } },
      { binding: 3, resource: { buffer: cellsPongStorageBuffer } },
      { binding: 4, resource: { buffer: cellsPingStorageBuffer } },
    ],
  });

  const bindGroup = { ping: bindGroupPing, pong: bindGroupPong };
  // @ts-expect-error: i promise (haha)
  cached = bindGroup;
  return bindGroup;
}
