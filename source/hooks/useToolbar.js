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

  if (!brushSizeControl) {
    throw new Error("Couldn't find brush size control");
  }

  const buffer = await useBuffer();
  const pointerUniformValues = buffer.pointer.values;

  toolbarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const toolName = button.getAttribute("value");
      if (toolName === null) {
        throw new Error("Toolbar button is missing a value attribute");
      }
      const toolId = ELEMENT_IDS[toolName];
      if (toolId === undefined) {
        throw new Error("Toolbar button is missing a valid value attribute");
      }
      if (toolName !== "empty") {
        localStorage.setItem("tool", toolName);
      }
      pointerUniformValues[5] = toolId;
    });
  });

  brushSizeControl.addEventListener("input", (event) => {
    const brushSize = parseInt(event.target?.["value"]);
    pointerUniformValues[6] = brushSize;
    localStorage.setItem("brushSize", brushSize.toString());
  });

  const localStorageBrushSize = localStorage.getItem("brushSize");
  if (localStorageBrushSize) {
    pointerUniformValues[6] = parseInt(localStorageBrushSize);
    brushSizeControl["value"] = localStorageBrushSize;
  }

  const localStorageTool = localStorage.getItem("tool");
  if (localStorageTool) {
    pointerUniformValues[5] = ELEMENT_IDS[localStorageTool];
  }

  addEventListener("keydown", (event) => {
    switch (event.key) {
      case "1": {
        pointerUniformValues[5] = ELEMENT_IDS.paint;
        localStorage.setItem("tool", "paint");
        return;
      }
      case "2": {
        pointerUniformValues[5] = ELEMENT_IDS.pipe;
        localStorage.setItem("tool", "pipe");
        return;
      }
      case "3": {
        pointerUniformValues[5] = ELEMENT_IDS.empty;
        return;
      }
      case "=": {
        const brushSize = pointerUniformValues[6];
        pointerUniformValues[6] = Math.min(brushSize + 1, 10);
        brushSizeControl["value"] = pointerUniformValues[6];
        localStorage.setItem("brushSize", pointerUniformValues[6].toString());
        return;
      }
      case "-": {
        const brushSize = pointerUniformValues[6];
        pointerUniformValues[6] = Math.max(brushSize - 1, 1);
        brushSizeControl["value"] = pointerUniformValues[6];
        localStorage.setItem("brushSize", pointerUniformValues[6].toString());
        return;
      }
    }
  });
}
