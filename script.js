export {};

const adapter = await navigator.gpu?.requestAdapter();
if (!adapter) {
  alert("Browser doesn't support WebGPU");
  throw new Error("Browser doesn't support WebGPU");
}
const device = await adapter.requestDevice();
if (!device) {
  alert("Browser doesn't support WebGPU");
  throw new Error("Browser doesn't support WebGPU");
}

const canvas = document.querySelector("canvas");
if (!canvas) throw new Error("Can't get canvas");
const context = canvas.getContext("webgpu");
if (!context) throw new Error("Can't get context");

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format: presentationFormat });

const module = device.createShaderModule({
  label: "shaders",
  code: `
      struct Canvas {
        size: vec2<f32>,
      };

      struct Clock {
        frame: f32,
      };

      struct Pointer {
        position: vec2<f32>,
        previousPosition: vec2<f32>,
        down: f32,
      };

      @group(0) @binding(1) var<uniform> clock: Clock;
      @group(0) @binding(0) var<uniform> canvas: Canvas;
      @group(0) @binding(2) var<uniform> pointer: Pointer;
      @group(0) @binding(3) var<storage, read_write> cells: array<u32>;

      struct VertexOutput {
        @builtin(position) position : vec4<f32>,
      };

      @vertex fn vertex(
        @builtin(vertex_index) vertexIndex: u32
      ) -> VertexOutput {
        let pos = array(
          vec2f( 1.0,  1.0), // top right
          vec2f(-1.0, -1.0), // bottom left
          vec2f( 1.0, -1.0),  // bottom right

          vec2f(-1.0,  1.0), // top left
          vec2f( 1.0,  1.0),  // top right
          vec2f(-1.0, -1.0),  // bottom left
        );
 
        var output: VertexOutput;
        output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
        return output;
      }
 
      @fragment fn fragment(input: VertexOutput) -> @location(0) vec4f {
        let red = (sin(clock.frame / 60.0) * 0.5 + 0.5);
        let green = input.position.y / canvas.size.y;
        let blue = input.position.x / canvas.size.x;

        let index = u32(input.position.x / canvas.size.x * 100.0) + u32(input.position.y / canvas.size.y * 100.0) * 100u;
        let cell = cells[index];
      
        if (pointer.down > 0.5) {
          if (pointer.previousPosition.x < -1.0) {
            let distanceToPointer = distance(input.position.xy, pointer.position);
            if (distanceToPointer < 50.0) {
              cells[index] = 1u;
              // return vec4(1.0, 1.0, 1.0, 1.0);
            }
          } else {
            let distanceToPointer = distanceToLine(pointer.previousPosition, pointer.position, input.position.xy);
            if (distanceToPointer < 50.0) {
              cells[index] = 1u;
              // return vec4(1.0, 1.0, 1.0, 1.0);
            }
          }
        }

        if (cell == 1) {
          return vec4(1 - red * 1, blue, green, 1.0);
        }

        return vec4(red, green, blue, 1.0);
        
      }

      // copied from stackoverflow
      fn findNearestPointOnLine(px: f32, py: f32, ax: f32, ay: f32, bx: f32, by: f32) -> vec2<f32> {
        let atob = vec2f(bx - ax, by - ay);
        let atop = vec2f(px - ax, py - ay);
        let len = (atob.x * atob.x) + (atob.y * atob.y);
        var dot = (atop.x * atob.x) + (atop.y * atob.y);
        let t = min(1.0, max(0.0, dot / len));

        dot = ((bx - ax) * (py - ay)) - ((by - ay) * (px - ax));

        return vec2f(ax + (atob.x * t), ay + (atob.y * t));
      }

      fn distanceToLine(a: vec2<f32>, b: vec2<f32>, p: vec2<f32>) -> f32 {
        let nearest = findNearestPointOnLine(p.x, p.y, a.x, a.y, b.x, b.y);
        return distance(nearest, p);
      }
    `,
});

const pipeline = device.createRenderPipeline({
  label: "pipeline",
  //"auto",
  layout: device.createPipelineLayout({
    label: "pipeline layout",
    bindGroupLayouts: [
      device.createBindGroupLayout({
        label: "bind group layout",
        // @ts-expect-error - my types are wrong
        entries: [
          {
            // canvas uniform
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              hasDynamicOffset: 0,
              minBindingSize: 8,
            },
          },
          {
            // clock uniform
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              hasDynamicOffset: 0,
              minBindingSize: 4,
            },
          },
          {
            // pointer uniform
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              hasDynamicOffset: 0,
              minBindingSize: 24,
            },
          },
          {
            // cells storage
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "storage",
              hasDynamicOffset: 0,
              minBindingSize: 4,
            },
          },
        ],
      }),
    ],
  }),
  vertex: {
    module,
    entryPoint: "vertex",
  },
  fragment: {
    module,
    entryPoint: "fragment",
    targets: [{ format: presentationFormat }],
  },
});

let previousPointerPosition = [-2, -2];
const render = () => {
  pointerUniformValues[2] = previousPointerPosition[0];
  pointerUniformValues[3] = previousPointerPosition[1];
  previousPointerPosition = [pointerUniformValues[0], pointerUniformValues[1]];
  device.queue.writeBuffer(pointerUniformBuffer, 0, pointerUniformValues);
  // device.queue.writeBuffer(cellsStorageBuffer, 0, cellsStorageArray);

  const encoder = device.createCommandEncoder({ label: "encoder" });

  const pass = encoder.beginRenderPass({
    label: "render pass",
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(6); // call shader six times (for the six points)
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
};

const canvasUniformValues = new Float32Array(2);
const canvasUniformBuffer = device.createBuffer({
  label: "canvas uniform buffer",
  size: canvasUniformValues.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const clockUniformValues = new Float32Array(1);
const clockUniformBuffer = device.createBuffer({
  label: "clock uniform buffer",
  size: clockUniformValues.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const pointerUniformValues = new Float32Array(6);
const pointerUniformBuffer = device.createBuffer({
  label: "pointer uniform buffer",
  size: pointerUniformValues.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

pointerUniformValues[0] = -2;
pointerUniformValues[1] = -2;
pointerUniformValues[2] = -2;
pointerUniformValues[3] = -2;

const GRID_SIZE = 100;
const cellsStorageArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
const cellsStorageBuffer = device.createBuffer({
  label: "cell storage buffer",
  size: cellsStorageArray.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  label: "uniform bind group",
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: canvasUniformBuffer } },
    { binding: 1, resource: { buffer: clockUniformBuffer } },
    { binding: 2, resource: { buffer: pointerUniformBuffer } },
    { binding: 3, resource: { buffer: cellsStorageBuffer } },
  ],
});

const handleResize = () => {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvasUniformValues[0] = canvas.width;
  canvasUniformValues[1] = canvas.height;
  device.queue.writeBuffer(canvasUniformBuffer, 0, canvasUniformValues);
  render();
};

addEventListener("pointermove", (event) => {
  pointerUniformValues[0] = event.clientX * devicePixelRatio;
  pointerUniformValues[1] = event.clientY * devicePixelRatio;

  // const gridPosition = [
  //   Math.floor((event.clientX / window.innerWidth) * GRID_SIZE),
  //   Math.floor((event.clientY / window.innerHeight) * GRID_SIZE),
  // ];

  // console.log(gridPosition);
});

addEventListener("pointerdown", (event) => {
  pointerUniformValues[4] = 1;
});

addEventListener("pointerup", (event) => {
  pointerUniformValues[4] = 0;

  pointerUniformValues[0] = -2;
  pointerUniformValues[1] = -2;
});

canvas.style.width = "100%";
canvas.style.height = "100%";
addEventListener("resize", handleResize);
handleResize();

let frame = 0;
const tick = () => {
  clockUniformValues[0] = frame;
  device.queue.writeBuffer(clockUniformBuffer, 0, clockUniformValues);
  frame++;
  render();
  requestAnimationFrame(tick);
};

for (let i = 0; i < cellsStorageArray.length; i++) {
  // cellsStorageArray[i] = i % 2 === 0 ? 0 : 1;
}

tick();
