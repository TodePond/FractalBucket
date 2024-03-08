import { GRID_SIZE } from "../constants.js";
import { useDevice } from "./useDevice.js";

/** @type {ReturnType<typeof getBuffers> | null} */
let cached = null;
export async function useBuffer() {
  if (cached) return cached;
  const buffers = await getBuffers();
  // @ts-expect-error: i promise (haha)
  cached = buffers;
  return buffers;
}

async function getBuffers() {
  const device = await useDevice();

  const canvasUniformValues = new Float32Array(2);
  const canvasUniformBuffer = device.createBuffer({
    label: "canvas uniform buffer",
    size: canvasUniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const clockUniformValues = new Float32Array(1);
  const clockUniformBuffer = device.createBuffer({
    label: "clock uniform buffer",
    size: clockUniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pointerUniformValues = new Float32Array(8);
  pointerUniformValues[5] = 1; // default to pipe tool
  pointerUniformValues[6] = 5; // default to middle brush size
  const pointerUniformBuffer = device.createBuffer({
    label: "pointer uniform buffer",
    size: pointerUniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const elementsStorageValues = new Uint32Array(GRID_SIZE * GRID_SIZE);
  const elementsStorageBuffer = device.createBuffer({
    label: "elements storage buffer",
    size: elementsStorageValues.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  return {
    canvas: {
      values: canvasUniformValues,
      buffer: canvasUniformBuffer,
    },
    clock: {
      values: clockUniformValues,
      buffer: clockUniformBuffer,
    },
    pointer: {
      values: pointerUniformValues,
      buffer: pointerUniformBuffer,
    },
    elements: {
      values: elementsStorageValues,
      buffer: elementsStorageBuffer,
    },
  };
}
