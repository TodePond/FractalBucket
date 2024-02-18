import { useBuffer } from "./useBuffer.js";

let done = false;

export async function usePointer() {
  if (done) return;
  done = true;

  const buffer = await useBuffer();
  const pointerUniformValues = buffer.pointer.values;

  addEventListener("pointermove", (event) => {
    pointerUniformValues[0] = event.clientX * devicePixelRatio;
    pointerUniformValues[1] = event.clientY * devicePixelRatio;
  });

  addEventListener("pointerdown", (event) => {
    pointerUniformValues[4] = 1;
    pointerUniformValues[0] = event.clientX * devicePixelRatio;
    pointerUniformValues[1] = event.clientY * devicePixelRatio;
  });

  addEventListener("pointerup", (event) => {
    pointerUniformValues[4] = 0;
  });
}
