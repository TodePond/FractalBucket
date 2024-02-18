import { GRID_SIZE, WORKGROUP_SIZE } from "../constants.js";
import { useStage } from "./useStage.js";

/**
 * @type {GPUShaderModule | null}
 */
let cached = null;

export async function useModule() {
  if (cached) return cached;
  const { device } = await useStage();
  cached = device.createShaderModule({
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
  
          cellsPong[index] = cellsPing[index];
  
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
  
        @compute
        @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
        fn compute(@builtin(global_invocation_id) cell: vec3u) {
        }
      `,
  });
  return cached;
}
