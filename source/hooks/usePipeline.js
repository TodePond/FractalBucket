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

  cached = device.createRenderPipeline({
    label: "pipeline",
    //"auto",
    layout: device.createPipelineLayout({
      label: "pipeline layout",
      bindGroupLayouts: [
        device.createBindGroupLayout({
          label: "bind group layout",
          // @ts-expect-error - my types are wrong
          entries: [
            {
              // canvas uniform
              binding: 0,
              visibility: GPUShaderStage.FRAGMENT,
              buffer: {
                hasDynamicOffset: 0,
                minBindingSize: 8,
              },
            },
            {
              // clock uniform
              binding: 1,
              visibility: GPUShaderStage.FRAGMENT,
              buffer: {
                hasDynamicOffset: 0,
                minBindingSize: 4,
              },
            },
            {
              // pointer uniform
              binding: 2,
              visibility: GPUShaderStage.FRAGMENT,
              buffer: {
                hasDynamicOffset: 0,
                minBindingSize: 24,
              },
            },
          ],
        }),
      ],
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
