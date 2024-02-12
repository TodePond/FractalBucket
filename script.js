export {};

const adapter = await navigator.gpu?.requestAdapter();
if (!adapter) throw new Error("Browser doesn't support WebGPU");
const device = await adapter.requestDevice();
if (!device) throw new Error("Browser doesn't support WebGPU");

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
        let red = sin(clock.frame / 60.0) * 0.5 + 0.5;
        let green = input.position.y / canvas.size.y;
        let blue = input.position.x / canvas.size.x;

        let gridIndex = u32(input.position.x / canvas.size.x * 100.0) + u32(input.position.y / canvas.size.y * 100.0) * 100u;
        let cell = cells[gridIndex];
      
        let distanceToPointer = distance(input.position.xy, pointer.position);
        if (distanceToPointer < 50.0) {
          cells[gridIndex] = 1u;
          // return vec4(1.0, 1.0, 1.0, 1.0);
        }

        if (cell == 1) {
          return vec4(red, blue, green, 1.0);
        }

        return vec4(red, green, blue, 1.0);
        
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
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              hasDynamicOffset: 0,
              minBindingSize: 8,
            },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              hasDynamicOffset: 0,
              minBindingSize: 4,
            },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              hasDynamicOffset: 0,
              minBindingSize: 8,
            },
          },
          {
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

const render = () => {
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

const pointerUniformValues = new Float32Array(2);
const pointerUniformBuffer = device.createBuffer({
  label: "pointer uniform buffer",
  size: pointerUniformValues.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

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
