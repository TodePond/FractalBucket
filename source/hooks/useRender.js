import { GRID_SIZE, WORKGROUP_SIZE } from "../constants.js";
import { useBindGroup } from "./useBindGroup.js";
import { useBuffer } from "./useBuffer.js";
import { useComputePipeline } from "./useComputePipeline.js";
import { useContext } from "./useContext.js";
import { useDevice } from "./useDevice.js";
import { useRenderPipeline } from "./useRenderPipeline.js";

let previousPointerPosition = [-2, -2];

/** @type {(() => void) | null} */
let cached = null;

export async function useRender() {
  if (cached) return cached;
  const buffer = await useBuffer();
  const device = await useDevice();
  const renderPipeline = await useRenderPipeline();
  const computePipeline = await useComputePipeline();
  const context = await useContext();
  const pointerUniformValues = buffer.pointer.values;
  const pointerUniformBuffer = buffer.pointer.buffer;
  const bindGroup = await useBindGroup();

  function render() {
    pointerUniformValues[2] = previousPointerPosition[0];
    pointerUniformValues[3] = previousPointerPosition[1];
    previousPointerPosition = [
      pointerUniformValues[0],
      pointerUniformValues[1],
    ];
    device.queue.writeBuffer(pointerUniformBuffer, 0, pointerUniformValues);

    const encoder = device.createCommandEncoder({ label: "encoder" });

    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);
    const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
    computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
    computePass.end();

    const renderPass = encoder.beginRenderPass({
      label: "render pass",
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6); // call shader six times (for the six points)
    renderPass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  cached = render;
  return render;
}
