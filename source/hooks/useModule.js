import { GRID_SIZE, WORKGROUP_SIZE } from "../constants.js";
import { useStage } from "./useStage.js";

/**
 * @type {GPUShaderModule | null}
 */
let cached = null;

export async function useModule() {
  if (cached) return cached;
  const { device } = await useStage();
  const module = getModule(device);
  cached = module;
  return cached;
}

/**
 * @param {GPUDevice} device
 */
function getModule(device) {
  return device.createShaderModule({
    label: "shader module",
    code: `
      //=========//
      // STRUCTS //
      //=========//
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

      struct VertexOutput {
        @builtin(position) position : vec4<f32>,
      };

      //==========//
      // BINDINGS //
      //==========//
      @group(0) @binding(1) var<uniform> clock: Clock;
      @group(0) @binding(0) var<uniform> canvas: Canvas;
      @group(0) @binding(2) var<uniform> pointer: Pointer;

      //===============//
      // VERTEX SHADER //
      //===============//
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

      //==========//
      // FRAGMENT //
      //==========//
      @fragment fn fragment(input: VertexOutput) -> @location(0) vec4f {
        let red = (sin(clock.frame / 240.0) * 0.5 + 0.5);
        let green = input.position.y / canvas.size.y;
        let blue = input.position.x / canvas.size.x;

        return vec4(red, green, blue, 1.0);
      }

      //=========//
      // COMPUTE //
      //=========//
      @compute
      @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
      fn compute(@builtin(global_invocation_id) cell: vec3u) {
      
      }
      `,
  });
}
