import { useBuffer } from "./useBuffer.js";

let done = false;

const ELEMENT_IDS = {
  pipe: 1,
  empty: 0,
  paint: 2,
};

export async function useToolbar() {
  if (done) return;
  done = true;

  const toolbarButtons = document.querySelectorAll("#toolbar button");
  const brushSizeControl = document.querySelector("#brush-size-control");

  const buffer = await useBuffer();
  const pointerUniformValues = buffer.pointer.values;

  toolbarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const toolName = button.getAttribute("value");
      const toolId = ELEMENT_IDS[toolName];
      if (toolId === undefined) {
        throw new Error("Toolbar button is missing a valid value attribute");
      }
      pointerUniformValues[5] = toolId;
    });
  });

  if (!brushSizeControl) {
    throw new Error("Couldn't find brush size control");
  }
  brushSizeControl.addEventListener("input", (event) => {
    const brushSize = parseInt(event.target?.["value"]);
    pointerUniformValues[6] = brushSize;
  });

  addEventListener("keydown", (event) => {
    switch (event.key) {
      case "1": {
        pointerUniformValues[5] = ELEMENT_IDS.paint;
        return;
      }
      case "2": {
        pointerUniformValues[5] = ELEMENT_IDS.pipe;
        return;
      }
      case "3": {
        pointerUniformValues[5] = ELEMENT_IDS.empty;
        return;
      }
    }
  });
}
