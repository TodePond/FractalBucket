import { SHADES, toShaderVector } from "../../libraries/habitat.js";
import {
  BRUSH_SIZE_MODIFIER,
  GRID_SIZE,
  WORKGROUP_SIZE,
} from "../constants.js";
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
        tool: f32,
        size: f32,
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
      @group(0) @binding(4) var<storage, read_write> paints: array<f32>;

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
        let gridPosition = getGridPositionFromPixelPosition(input.pixelPosition.xy);
        let element = getElementAtGridPosition(gridPosition);
        let paint = paints[gridIndex];
        if (element == PIPE) {
          if (isGridPositionTouchingElementShadow(gridPosition, EMPTY)) {
            return vec4(${toShaderVector(SHADES[10])});
          }
          let colour = vec4(${toShaderVector(SHADES[5])});
          return vec4(colour.r, colour.g + paint / 2.0, colour.b + paint, 1.0);
        }
        if (element == HEAD) {
          return vec4(${toShaderVector(SHADES[10])});
        }
        let colour = vec4(${toShaderVector(SHADES[2])});
        return vec4(colour.r, colour.g + paint / 2.0, colour.b + paint, 1.0);
      }

      //=========//
      // COMPUTE //
      //=========//
      @compute
      @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
      fn compute(@builtin(global_invocation_id) gridPosition: vec3u) {
        let position = vec2i(gridPosition.xy);
        let gridIndex = getGridIndexFromGridPosition(position);
        
        let element = getElementAtGridPosition(position);
        let right = getElementAtGridPosition(position + RIGHT);
        let left = getElementAtGridPosition(position + LEFT);
        let up = getElementAtGridPosition(position + UP);
        let down = getElementAtGridPosition(position + DOWN);

        let pixelPosition = getPixelPositionFromGridPosition(position);

        if (element == PIPE) {
          let paint = paints[gridIndex];
        }

        if (pointer.down > 0.5) {
          let distanceToPointer = distance(pixelPosition, pointer.position);
          if (distanceToPointer < pointer.size * ${BRUSH_SIZE_MODIFIER}) {
            applyBrushToGridIndex(gridIndex);
          }
          
          let distanceToPointerLine = distanceToLine(pointer.previousPosition, pointer.position, pixelPosition);
          if (distanceToPointerLine < pointer.size * ${BRUSH_SIZE_MODIFIER}) {
            applyBrushToGridIndex(gridIndex);
          }
        }


      }

      fn applyBrushToGridIndex(gridIndex: i32) {

        if (pointer.tool == PAINT) {

          let element = elements[gridIndex];
          if (element == EMPTY) {
            paints[gridIndex] = 1.0;
            return;
          }

          if (element == PIPE) {
            elements[gridIndex] = HEAD;
            paints[gridIndex] = 1.0;
            return;
          }

          return;
        }

        if (pointer.tool == PIPE) {
          let element = elements[gridIndex];
          let paint = paints[gridIndex];

          if (element == EMPTY) {
            if (paint > 0.0) {
              elements[gridIndex] = HEAD;
              return;
            }
            elements[gridIndex] = PIPE;
            return;
          }
        }

        elements[gridIndex] = i32(pointer.tool);
      }

      //=========//
      // HELPERS //
      //=========//
      const VOID = 99;
      const EMPTY = 0;
      const PIPE = 1;
      const PAINT = 2;
      const HEAD = 3;
      const TAIL = 4;

      const CENTER = vec2(0, 0);
      const LEFT = vec2(-1, 0);
      const RIGHT = vec2(1, 0);
      const UP = vec2(0, -1);
      const DOWN = vec2(0, 1);

      fn getElementAtGridPosition(gridPosition: vec2<i32>) -> i32 {
        if (gridPosition.x >= ${GRID_SIZE}i - 1 || gridPosition.y >= ${GRID_SIZE}i) {
          return VOID;
        }
        
        let gridIndex = getGridIndexFromGridPosition(gridPosition);
        return elements[gridIndex];
      }

      fn getPaintAtGridPosition(gridPosition: vec2<i32>) -> f32 {
        if (gridPosition.x >= ${GRID_SIZE}i - 1 || gridPosition.y >= ${GRID_SIZE}i) {
          return 0.0;
        }

        if (gridPosition.x < 0 || gridPosition.y < 0) {
          return 0.0;
        }

        
        
        let gridIndex = getGridIndexFromGridPosition(gridPosition);
        return paints[gridIndex];
      }

      fn isGridPositionTouchingElementShadow(gridPosition: vec2<i32>, element: i32) -> bool {
        // let up = getElementAtGridPosition(gridPosition + UP);
        // let left = getElementAtGridPosition(gridPosition + LEFT);
        // if (left == element) {
        //   return false;
        // }
        let down = getElementAtGridPosition(gridPosition + DOWN);
        if (down == element) {
          return true;
        }
        let downDown = getElementAtGridPosition(gridPosition + DOWN + DOWN);
        if (downDown == element) {
          // return true;
        }
        let right = getElementAtGridPosition(gridPosition + DOWN + RIGHT);
        if (right == element) {
          return true;
        }
        return false;
      }


      fn getNeighbouringMaxPaint(gridPosition: vec2<i32>) -> f32 {
        let up = getPaintAtGridPosition(gridPosition + UP);
        let down = getPaintAtGridPosition(gridPosition + DOWN);
        let left = getPaintAtGridPosition(gridPosition + LEFT);
        let right = getPaintAtGridPosition(gridPosition + RIGHT);
        
        let maxPaint = maxFour(up, down, left, right);
        return maxPaint;
      }

      fn maxFour(a: f32, b: f32, c: f32, d: f32) -> f32 {
        let ab = max(a, b);
        let cd = max(c, d);
        let abcd = max(ab, cd);
        return abcd;
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

      fn getPixelPositionFromGridPosition(gridPosition: vec2<i32>) -> vec2<f32> {
        let x = f32(gridPosition.x) / ${GRID_SIZE}.0 * canvas.size.x;
        let y = f32(gridPosition.y) / ${GRID_SIZE}.0 * canvas.size.y;
        return vec2(x, y);
      }

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
}
