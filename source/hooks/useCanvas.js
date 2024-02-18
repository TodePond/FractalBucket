/** @type {HTMLCanvasElement | null} */
let cached = null;

export function useCanvas() {
  if (cached) return cached;
  const canvas = document.querySelector("canvas");
  if (!canvas) throw new Error("Can't get canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const handleResize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  };

  canvas.addEventListener("resize", handleResize);
  handleResize();

  cached = canvas;
  return cached;
}
