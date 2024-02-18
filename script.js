export {};

const GRID_SIZE = 500;

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
      @group(0) @binding(3) var<storage, read_write> cellsPing: array<u32>;
      @group(0) @binding(4) var<storage, read_write> cellsPong: array<u32>;

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

      fn getIndexFromPixelPosition(pixelPosition: vec2<f32>) -> u32 {
        let position = getPositionFromPixelPosition(pixelPosition);
        return position.x + position.y * ${GRID_SIZE}u;
      }
 
      fn getPositionFromPixelPosition(position: vec2<f32>) -> vec2<u32> {
        let x = u32(position.x / canvas.size.x * ${GRID_SIZE}.0);
        let y = u32(position.y / canvas.size.y * ${GRID_SIZE}.0);
        return vec2(x, y);
      }

      @fragment fn fragment(input: VertexOutput) -> @location(0) vec4f {
        let red = (sin(clock.frame / 240.0) * 0.5 + 0.5);
        let green = input.position.y / canvas.size.y;
        let blue = input.position.x / canvas.size.x;
        
        let index = getIndexFromPixelPosition(input.position.xy);
        
        let cell = cellsPing[index];
        let below = cellsPing[index + ${GRID_SIZE}u];
        let above = cellsPing[index - ${GRID_SIZE}u];
        
        cellsPong[index] = cell;

        if (cell == 1u) {
          if (index + ${GRID_SIZE}u < ${GRID_SIZE * GRID_SIZE}u) {
            if (below == 0u) {
              cellsPong[index] = 0u;
            }
          }
        }

        if (cell == 0u) {
          if (index - ${GRID_SIZE}u < ${GRID_SIZE * GRID_SIZE}u) {
            if (above == 1u) {
              cellsPong[index] = 1u;
            }
          }
        }

        if (pointer.down > 0.5) {
          let distanceToPointer = distanceToNearestPointOnLineSegment(pointer.previousPosition, pointer.position, input.position.xy);
          if (distanceToPointer < 50.0) {
            cellsPong[index] = 1u;
            // return vec4(1.0, 1.0, 1.0, 1.0);
          }
        }

        if (cellsPong[index] == 1) {
          return vec4(1 - red * 1, blue, green, 1.0);
        }

        return vec4(red, green, blue, 1.0);
      }

      const VOID = 99u;
      const AIR = 0u;
      const SAND = 1u;

      fn distanceToNearestPointOnLineSegment(p1: vec2<f32>, p2: vec2<f32>, p: vec2<f32>) -> f32 {
        let v = p2 - p1;
        let w = p - p1;
        let c1 = dot(w, v);
        if (c1 <= 0.0) {
          return distance(p, p1);
        }
        let c2 = dot(v, v);
        if (c2 <= c1) {
          return distance(p, p2);
        }
        let b = c1 / c2;
        let pb = p1 + b * v;
        return distance(p, pb);
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
            // cells ping storage
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {
              type: "storage",
              hasDynamicOffset: 0,
              minBindingSize: 4,
            },
          },
          {
            // cells pong storage
            binding: 4,
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
let pingPong = true;
const render = () => {
  pingPong = !pingPong;
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
  pass.setBindGroup(0, pingPong ? bindGroupPing : bindGroupPong);
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

// pointerUniformValues[0] = -2;
// pointerUniformValues[1] = -2;
// pointerUniformValues[2] = -2;
// pointerUniformValues[3] = -2;

const cellsPingStorageArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
const cellsPingStorageBuffer = device.createBuffer({
  label: "cell ping storage buffer",
  size: cellsPingStorageArray.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const cellsPongStorageArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
const cellsPongStorageBuffer = device.createBuffer({
  label: "cell pong storage buffer",
  size: cellsPongStorageArray.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const bindGroupPing = device.createBindGroup({
  label: "uniform bind group ping",
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: canvasUniformBuffer } },
    { binding: 1, resource: { buffer: clockUniformBuffer } },
    { binding: 2, resource: { buffer: pointerUniformBuffer } },
    { binding: 3, resource: { buffer: cellsPingStorageBuffer } },
    { binding: 4, resource: { buffer: cellsPongStorageBuffer } },
  ],
});

const bindGroupPong = device.createBindGroup({
  label: "uniform bind group pong",
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: canvasUniformBuffer } },
    { binding: 1, resource: { buffer: clockUniformBuffer } },
    { binding: 2, resource: { buffer: pointerUniformBuffer } },
    { binding: 3, resource: { buffer: cellsPongStorageBuffer } },
    { binding: 4, resource: { buffer: cellsPingStorageBuffer } },
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
  pointerUniformValues[0] = event.clientX * devicePixelRatio;
  pointerUniformValues[1] = event.clientY * devicePixelRatio;
  previousPointerPosition[0] = pointerUniformValues[0];
  previousPointerPosition[1] = pointerUniformValues[1];
});

addEventListener("pointerup", (event) => {
  pointerUniformValues[4] = 0;

  // pointerUniformValues[2] = -2;
  // pointerUniformValues[3] = -2;
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

for (let i = 0; i < cellsPingStorageArray.length; i++) {
  // cellsStorageArray[i] = i % 2 === 0 ? 0 : 1;
}

tick();
