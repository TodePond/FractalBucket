import { useContext } from "./useContext.js";
import { useDevice } from "./useDevice.js";
import { useFormat } from "./useFormat.js";

let done = false;

/**
 * Configure and setup the webgpu context.
 */
export async function useConfiguration() {
  if (done) return;
  const device = await useDevice();
  const context = useContext();
  const format = useFormat();
  context.configure({ device, format });
  done = true;
}
