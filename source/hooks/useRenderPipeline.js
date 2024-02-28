import { useDevice } from "./useDevice.js";
import { useFormat } from "./useFormat.js";
import { useModule } from "./useModule.js";
import { usePipelineLayout } from "./usePipelineLayout.js";

/**
 * @type {GPURenderPipeline | null}
 */
let cached = null;

export async function useRenderPipeline() {
  if (cached) return cached;
  const device = await useDevice();
  const format = useFormat();
  const module = await useModule();
  const pipelineLayout = await usePipelineLayout();

  cached = device.createRenderPipeline({
    label: "pipeline",
    layout: pipelineLayout,
    vertex: {
      module,
      entryPoint: "vertex",
    },
    fragment: {
      module,
      entryPoint: "fragment",
      targets: [{ format }],
    },
  });

  return cached;
}
