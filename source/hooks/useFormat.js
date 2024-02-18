let cached = null;

export function useFormat() {
  if (cached) return cached;
  const canvasFormat = navigator.gpu?.getPreferredCanvasFormat();
  if (!canvasFormat) throw new Error("Can't get preferred canvas format");
  cached = canvasFormat;
  return cached;
}
