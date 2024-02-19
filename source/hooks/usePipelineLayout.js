import { useBindGroupLayout } from "./useBindGroupLayout.js";
import { useDevice } from "./useDevice.js";

/** @type {GPUPipelineLayout | null} */
let cached = null;

export async function usePipelineLayout() {
  if (cached) return cached;
  const pipelineLayout = await getPipelineLayout();
  cached = pipelineLayout;
  return pipelineLayout;
}

async function getPipelineLayout() {
  const device = await useDevice();
  const bindGroupLayout = await useBindGroupLayout();
  return device.createPipelineLayout({
    label: "pipeline layout",
    bindGroupLayouts: [bindGroupLayout],
  });
}
