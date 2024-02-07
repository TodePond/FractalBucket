import { registerDotDee } from "./habitat.js";

if (location.href.startsWith("http://localhost")) {
	registerDotDee()
}

if (!navigator.gpu) throw new Error("WebGPU is not supported in this browser.");
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error("Couldn't get WebGPU adapter.");
const device = await adapter.requestDevice();
if (!device) throw new Error("Couldn't get WebGPU device.");

const shaders = `
	struct VertexOut {
		@builtin(position) position : vec4f,
		@location(0) color : vec4f
	}

	@vertex
	fn vertex_main(@location(0) position: vec4f, @location(1) color: vec4f) -> VertexOut {
		var output : VertexOut;
		output.position = position;
		output.color = color;
		return output;
	}

	@fragment
	fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
		return fragData.color;
	}
`;

const shaderModule = device.createShaderModule({
	code: shaders,
})

const canvas = document.querySelector("canvas");
if (!canvas) throw new Error("Canvas not found.");
const context = canvas.getContext("webgpu");
if (!context) throw new Error("WebGPU context not found.");

context.configure({
	device,
	format: navigator.gpu.getPreferredCanvasFormat(),
	alphaMode: "premultiplied",
})

const vertices = new Float32Array([
	0.0, 0.6, 0, 1, 1, 0, 0, 1, -0.5, -0.6, 0, 1, 0, 1, 0, 1, 0.5, -0.6, 0, 1, 0,
	0, 1, 1,
]);

// Create our empty buffer
const vertexBuffer = device.createBuffer({
	size: vertices.byteLength,
	usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

// Write data into the buffer
device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

const vertexBufferDescriptor = {
	attributes: [
		{
			shaderLocation: 0, // position
			offset: 0,
			format: "float32x4",
		},
		{
			shaderLocation: 1, // color
			offset: 16,
			format: "float32x4",
		},
	],
	arrayStride: 32,
	stepMode: "vertex",
};

const pipelineDescriptor = {
	vertex: {
		module: shaderModule,
		entryPoint: "vertex_main",
		buffers: [vertexBufferDescriptor],
	},
	fragment: {
		module: shaderModule,
		entryPoint: "fragment_main",
		targets: [
			{
				format: "bgra8unorm",
			},
		],
	},
	primitive: {
		topology: "triangle-list",
	},
	layout: "auto"
};

// @ts-expect-error: my types file is wrong
const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

const commandEncoder = device.createCommandEncoder();

const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

const renderPassDescriptor = {
	colorAttachments: [
		{
			clearValue: clearColor,
			loadOp: "clear",
			storeOp: "store",
			view: context.getCurrentTexture().createView(),
		},
	],
};

// @ts-expect-error: my types file is wrong
const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

passEncoder.setPipeline(renderPipeline);
passEncoder.setVertexBuffer(0, vertexBuffer);
passEncoder.draw(3);
passEncoder.end();

device.queue.submit([commandEncoder.finish()]);