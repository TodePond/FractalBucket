import { useConfiguration } from "./source/hooks/useConfiguration.js";
import { usePointer } from "./source/hooks/usePointer.js";
import { useTick } from "./source/hooks/useTick.js";
import { useResize } from "./source/hooks/useResize.js";
import { useToolbar } from "./source/hooks/useToolbar.js";

await useToolbar();
await useConfiguration();
await useResize();
await usePointer();

const tick = await useTick();

tick();
