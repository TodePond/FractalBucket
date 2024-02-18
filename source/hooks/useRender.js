import { useBindGroup } from "./useBindGroup.js";
import { useBuffer } from "./useBuffer.js";
import { useContext } from "./useContext.js";
import { useDevice } from "./useDevice.js";
import { usePipeline } from "./usePipeline.js";

let previousPointerPosition = [-2, -2];
let pingPong = true;

/** @type {(() => void) | null} */
let cached = null;

export async function useRender() {
  if (cached) return cached;
  const buffer = await useBuffer();
  const device = await useDevice();
  const pipeline = await usePipeline();
  const context = await useContext();
  const pointerUniformValues = buffer.pointer.values;
  const pointerUniformBuffer = buffer.pointer.buffer;
  const bindGroup = await useBindGroup();
  const bindGroupPing = bindGroup.ping;
  const bindGroupPong = bindGroup.pong;

  function render() {
    pingPong = !pingPong;
    pointerUniformValues[2] = previousPointerPosition[0];
    pointerUniformValues[3] = previousPointerPosition[1];
    previousPointerPosition = [
      pointerUniformValues[0],
      pointerUniformValues[1],
    ];
    device.queue.writeBuffer(pointerUniformBuffer, 0, pointerUniformValues);
    // device.queue.writeBuffer(cellsStorageBuffer, 0, cellsStorageArray);

    const encoder = device.createCommandEncoder({ label: "encoder" });

    const pass = encoder.beginRenderPass({
      label: "render pass",
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, pingPong ? bindGroupPing : bindGroupPong);
    pass.draw(6); // call shader six times (for the six points)
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  cached = render;
  return render;
}
