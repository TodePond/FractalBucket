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

      @group(0) @binding(1) var<uniform> clock : Clock;
      @group(0) @binding(0) var<uniform> canvas : Canvas;
      @group(0) @binding(2) var<uniform> pointer : Pointer;


      struct VertexOutput {
        @builtin(position) position : vec4<f32>,
      };

      @vertex fn vertex(
        @builtin(vertex_index) vertexIndex : u32
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

        let distanceToPointer = distance(input.position.xy, pointer.position);
        if (distanceToPointer < 50.0) {
          return vec4(1.0, 1.0, 1.0, 1.0);
        }

        return vec4(red, green, blue, 1.0);
        
      }
    `,
});

const pipeline = device.createRenderPipeline({
  label: "pipeline",
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
  device.queue.writeBuffer(clockUniformBuffer, 0, clockUniformValues);
  device.queue.writeBuffer(canvasUniformBuffer, 0, canvasUniformValues);
  device.queue.writeBuffer(pointerUniformBuffer, 0, pointerUniformValues);

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
  size: 4 * 2,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const clockUniformValues = new Float32Array(1);
const clockUniformBuffer = device.createBuffer({
  label: "clock uniform buffer",
  size: 4,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const pointerUniformValues = new Float32Array(2);
const pointerUniformBuffer = device.createBuffer({
  label: "cursor uniform buffer",
  size: 4 * 2,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  label: "uniform bind group",
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: canvasUniformBuffer } },
    { binding: 1, resource: { buffer: clockUniformBuffer } },
    { binding: 2, resource: { buffer: pointerUniformBuffer } },
  ],
});

const handleResize = () => {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvasUniformValues[0] = canvas.width;
  canvasUniformValues[1] = canvas.height;
  render();
};

addEventListener("pointermove", (event) => {
  pointerUniformValues[0] = event.clientX * devicePixelRatio;
  pointerUniformValues[1] = event.clientY * devicePixelRatio;
});

canvas.style.width = "100%";
canvas.style.height = "100%";
addEventListener("resize", handleResize);
handleResize();

let frame = 0;
const tick = () => {
  clockUniformValues[0] = frame;
  frame++;
  render();
  requestAnimationFrame(tick);
};

tick();
