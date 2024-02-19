import { useDevice } from "./useDevice.js";
import { useModule } from "./useModule.js";
import { usePipelineLayout } from "./usePipelineLayout.js";

/**
 * @type {GPUComputePipeline | null}
 */
let cached = null;

export async function useComputePipeline() {
  if (cached) return cached;
  const computePipeline = await getComputePipeline();
  cached = computePipeline;
  return computePipeline;
}

async function getComputePipeline() {
  const device = await useDevice();
  const pipelineLayout = await usePipelineLayout();
  const module = await useModule();
  return device.createComputePipeline({
    label: "compute pipeline",
    layout: pipelineLayout,
    compute: {
      module,
      entryPoint: "compute",
    },
  });
}
