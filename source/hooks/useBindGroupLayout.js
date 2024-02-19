import { useDevice } from "./useDevice.js";

let cached = null;

export async function useBindGroupLayout() {
  if (cached) return cached;
  const layout = await getBindGroupLayout();
  cached = layout;
  return cached;
}

async function getBindGroupLayout() {
  const device = await useDevice();
  return device.createBindGroupLayout({
    label: "bind group layout",
    entries: [
      {
        // canvas uniform
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        // clock uniform
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        // pointer uniform
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        // elements storage
        binding: 3,
        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: "storage" },
      },
    ],
  });
}
