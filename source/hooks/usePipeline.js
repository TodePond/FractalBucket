import { useBindGroupLayout } from "./useBindGroupLayout.js";
import { useModule } from "./useModule.js";
import { useStage } from "./useStage.js";

/**
 * @type {GPURenderPipeline | null}
 */
let cached = null;

export async function usePipeline() {
  if (cached) return cached;
  const { device, format } = await useStage();
  const module = await useModule();
  const bindGroupLayout = await useBindGroupLayout();

  cached = device.createRenderPipeline({
    label: "pipeline",
    //"auto",
    layout: device.createPipelineLayout({
      label: "pipeline layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
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
