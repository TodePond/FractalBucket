import { useBuffer } from "./useBuffer.js";
import { useCanvas } from "./useCanvas.js";
import { useDevice } from "./useDevice.js";
import { useRender } from "./useRender.js";

let done = false;

export async function useWindow() {
  if (done) return;
  done = true;
  const buffer = await useBuffer();
  const canvasUniformBuffer = buffer.canvas.buffer;
  const canvasUniformValues = buffer.canvas.values;
  const canvas = useCanvas();
  const device = await useDevice();
  const render = await useRender();

  const handleResize = () => {
    canvasUniformValues[0] = canvas.width;
    canvasUniformValues[1] = canvas.height;
    device.queue.writeBuffer(canvasUniformBuffer, 0, canvasUniformValues);
    render();
  };

  addEventListener("resize", handleResize);
  handleResize();
}
