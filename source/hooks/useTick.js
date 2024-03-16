import { useBuffer } from "./useBuffer.js";
import { useDevice } from "./useDevice.js";
import { useRender } from "./useRender.js";

let cached = null;

let frame = 0;
export async function useTick() {
  if (cached) return cached;

  const device = await useDevice();
  const buffer = await useBuffer();
  const clockUniformBuffer = buffer.clock.buffer;
  const clockUniformValues = buffer.clock.values;
  const render = await useRender();

  const tick = () => {
    let i = 0;
    while (i < 1) {
      clockUniformValues[0] = frame;
      device.queue.writeBuffer(clockUniformBuffer, 0, clockUniformValues);
      frame++;
      render();
      i++;
    }
    requestAnimationFrame(tick);
  };

  cached = tick;
  return tick;
}
