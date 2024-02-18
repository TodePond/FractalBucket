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

  const pointerUniformValues = new Float32Array(6);
  const pointerUniformBuffer = device.createBuffer({
    label: "pointer uniform buffer",
    size: pointerUniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // pointerUniformValues[0] = -2;
  // pointerUniformValues[1] = -2;
  // pointerUniformValues[2] = -2;
  // pointerUniformValues[3] = -2;

  const cellsPingStorageArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
  const cellsPingStorageBuffer = device.createBuffer({
    label: "cell ping storage buffer",
    size: cellsPingStorageArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const cellsPongStorageArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
  const cellsPongStorageBuffer = device.createBuffer({
    label: "cell pong storage buffer",
    size: cellsPongStorageArray.byteLength,
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
    cellsPing: {
      array: cellsPingStorageArray,
      buffer: cellsPingStorageBuffer,
    },
    cellsPong: {
      array: cellsPongStorageArray,
      buffer: cellsPongStorageBuffer,
    },
  };
}
