import { GRID_SIZE, WORKGROUP_SIZE } from "../constants.js";
import { useDevice } from "./useDevice.js";

/**
 * @type {GPUShaderModule | null}
 */
let cached = null;

export async function useModule() {
  if (cached) return cached;
  const device = await useDevice();
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
        @builtin(position) pixelPosition : vec4<f32>,
      };

      //==========//
      // BINDINGS //
      //==========//
      @group(0) @binding(1) var<uniform> clock: Clock;
      @group(0) @binding(0) var<uniform> canvas: Canvas;
      @group(0) @binding(2) var<uniform> pointer: Pointer;
      @group(0) @binding(3) var<storage, read_write> elements: array<i32>;

      //========//
      // VERTEX //
      //========//
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
        output.pixelPosition = vec4f(pos[vertexIndex], 0.0, 1.0);
        return output;
      }

      //==========//
      // FRAGMENT //
      //==========//
      @fragment fn fragment(input: VertexOutput) -> @location(0) vec4f {
        let red = (sin(clock.frame / 240.0) * 0.5 + 0.5);
        let green = input.pixelPosition.y / canvas.size.y;
        let blue = input.pixelPosition.x / canvas.size.x;

        let gridIndex = getGridIndexFromPixelPosition(input.pixelPosition.xy);
        let element = elements[gridIndex];
        if (element == 1) {
          return vec4(green, blue, red, 1.0);
        }
        return vec4(red, green, blue, 1.0);
      }

      //=========//
      // COMPUTE //
      //=========//
      @compute
      @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
      fn compute(@builtin(global_invocation_id) gridPosition: vec3u) {
        let position = vec2i(gridPosition.xy);
        let gridIndex = getGridIndexFromGridPosition(position);
        
        let right = getElementAtGridPosition(position + RIGHT);
        let left = getElementAtGridPosition(position + LEFT);
        let up = getElementAtGridPosition(position + UP);
        let down = getElementAtGridPosition(position + DOWN);

        if (right == FORKBOMB) {
          setElementAtGridPosition(position, FORKBOMB);
        } else if (left == FORKBOMB) {
          setElementAtGridPosition(position, FORKBOMB);
        } else if (up == FORKBOMB) {
          setElementAtGridPosition(position, FORKBOMB);
        } else if (down == FORKBOMB) {
          setElementAtGridPosition(position, FORKBOMB);
        }

        if (pointer.down > 0.5) {
          let pointerGridIndex = getGridIndexFromPixelPosition(pointer.position);
          if (pointerGridIndex == gridIndex) {
            elements[gridIndex] = 1;
          }
        }
        
      }

      //=========//
      // HELPERS //
      //=========//
      const VOID = 99;
      const AIR = 0;
      const FORKBOMB = 1;

      const LEFT = vec2(-1, 0);
      const RIGHT = vec2(1, 0);
      const UP = vec2(0, 1);
      const DOWN = vec2(0, -1);

      fn getElementAtGridPosition(gridPosition: vec2<i32>) -> i32 {
        if (gridPosition.x >= ${GRID_SIZE}i || gridPosition.y >= ${GRID_SIZE}i) {
          return VOID;
        }
        let gridIndex = getGridIndexFromGridPosition(gridPosition);
        return elements[gridIndex];
      }

      fn setElementAtGridPosition(gridPosition: vec2<i32>, value: i32) {
        if (gridPosition.x >= ${GRID_SIZE}i || gridPosition.y >= ${GRID_SIZE}i) {
          return;
        }
        let gridIndex = getGridIndexFromGridPosition(gridPosition);
        elements[gridIndex] = value;
      }

      fn getGridIndexFromPixelPosition(pixelPosition: vec2<f32>) -> i32 {
        let gridPosition = getGridPositionFromPixelPosition(pixelPosition);
        return getGridIndexFromGridPosition(gridPosition);
      }

      fn getGridPositionFromPixelPosition(position: vec2<f32>) -> vec2<i32> {
        let x = i32(position.x / canvas.size.x * ${GRID_SIZE}.0);
        let y = i32(position.y / canvas.size.y * ${GRID_SIZE}.0);
        return vec2(x, y);
      }

      fn getGridIndexFromGridPosition(gridPosition: vec2<i32>) -> i32 {
        return gridPosition.x + gridPosition.y * ${GRID_SIZE}i;
      }

      `,
  });
}
