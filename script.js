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

      @group(0) @binding(0) var<uniform> canvas : Canvas;

      struct VertexOutput {
        @builtin(position) position : vec4<f32>,
      };

      @vertex fn vs(
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
 
      @fragment fn fs(input: VertexOutput) -> @location(0) vec4f {
        return vec4<f32>(0.0, input.position.y / canvas.size.y, input.position.x / canvas.size.x, 1.0);
        
      }
    `,
});

const pipeline = device.createRenderPipeline({
  label: "pipeline",
  layout: "auto",
  vertex: {
    module,
    entryPoint: "vs",
  },
  fragment: {
    module,
    entryPoint: "fs",
    targets: [{ format: presentationFormat }],
  },
});

const renderPassDescriptor = {
  label: "render pass",
  colorAttachments: [
    {
      // view: undefined,
      clearValue: [0.3, 0.3, 0.3, 1.0],
      loadOp: "clear",
      storeOp: "store",
    },
  ],
};

const render = () => {
  device.queue.writeBuffer(canvasUniformBuffer, 0, canvasUniformValues);

  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const encoder = device.createCommandEncoder({ label: "encoder" });

  // @ts-expect-error - my types are wrong
  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(6); // call shader six times (for the six points)
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
};

const canvasUniformBufferSize = 2 * 4; // 2 floats
const canvasUniformBuffer = device.createBuffer({
  label: "canvas uniform buffer",
  size: canvasUniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const canvasUniformValues = new Float32Array(2);

const bindGroup = device.createBindGroup({
  label: "canvas uniform bind group",
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: canvasUniformBuffer } }],
});

const handleResize = () => {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvasUniformValues[0] = canvas.width;
  canvasUniformValues[1] = canvas.height;
  context.configure({ device, format: presentationFormat });
  render();
};

canvas.style.width = "100%";
canvas.style.height = "100%";
addEventListener("resize", handleResize);
handleResize();
