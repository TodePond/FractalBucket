import { usePointer } from "./source/hooks/usePointer.js";
import { useTick } from "./source/hooks/useTick.js";
import { useWindow } from "./source/hooks/useWindow.js";

await useWindow();
await usePointer();
const tick = await useTick();

tick();
