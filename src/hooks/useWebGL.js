import { useEffect, useRef, useCallback } from 'react'

const VERT_SRC = `#version 300 es
in vec2 aPosition;
out vec2 vTexCoord;
void main() {
  vTexCoord = aPosition * 0.5 + 0.5;
  vTexCoord.y = 1.0 - vTexCoord.y;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAG_SRC = `#version 300 es
precision mediump float;
in vec2 vTexCoord;
uniform sampler2D uImage;
uniform mediump sampler3D uLUT;
uniform float uLUTSize;
uniform float uExposure;
uniform float uIntensity;
out vec4 fragColor;
void main() {
  vec4 color = texture(uImage, vTexCoord);
  float ev = uExposure / 50.0;
  color.rgb *= pow(2.0, ev * 2.0);
  color.rgb = clamp(color.rgb, 0.0, 1.0);
  float scale = (uLUTSize - 1.0) / uLUTSize;
  float offset = 0.5 / uLUTSize;
  vec3 lutCoord = color.rgb * scale + offset;
  vec3 lutColor = texture(uLUT, lutCoord).rgb;
  fragColor = vec4(mix(color.rgb, lutColor, uIntensity), color.a);
}`

// Module-level texture cache keyed by the lutData object reference.
// Avoids stale-data bugs when presetId changes before lutData updates.
const lutTextureCache = new WeakMap()

function compileShader(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${log}`)
  }
  return shader
}

function createProgram(gl) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
  const prog = gl.createProgram()
  gl.attachShader(prog, vert)
  gl.attachShader(prog, frag)
  gl.linkProgram(prog)
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog)
    gl.deleteProgram(prog)
    throw new Error(`Program link error: ${log}`)
  }
  return prog
}

/**
 * Manages WebGL 2.0 rendering.
 * Accepts the canvas DOM element directly (not a ref) so the setup effect
 * correctly re-runs when the canvas mounts/unmounts.
 *
 * @param {HTMLCanvasElement|null} canvas
 * @param {HTMLImageElement|null} image
 * @param {{size: number, data: Float32Array}|null} lutData
 * @param {string} presetId
 * @param {number} exposure  -50 to +50
 */
export function useWebGL(canvas, image, lutData, presetId, exposure, intensity) {
  const glRef = useRef(null)
  const progRef = useRef(null)
  const imgTexRef = useRef(null)
  const quadBufRef = useRef(null)
  const uniformsRef = useRef({})

  // Effect 1: GL context + shader program — re-runs when canvas element changes
  useEffect(() => {
    if (!canvas) return

    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
    if (!gl) {
      console.error('[film-simulation] WebGL 2 not supported')
      return
    }

    gl.getExtension('EXT_color_buffer_float')
    // LINEAR filtering on float textures requires this extension in WebGL 2
    gl.getExtension('OES_texture_float_linear')
    glRef.current = gl

    const prog = createProgram(gl)
    progRef.current = prog

    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
    quadBufRef.current = buf

    const aPos = gl.getAttribLocation(prog, 'aPosition')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    uniformsRef.current = {
      uImage: gl.getUniformLocation(prog, 'uImage'),
      uLUT: gl.getUniformLocation(prog, 'uLUT'),
      uLUTSize: gl.getUniformLocation(prog, 'uLUTSize'),
      uExposure: gl.getUniformLocation(prog, 'uExposure'),
      uIntensity: gl.getUniformLocation(prog, 'uIntensity'),
    }

    return () => {
      if (progRef.current) { gl.deleteProgram(progRef.current); progRef.current = null }
      if (quadBufRef.current) { gl.deleteBuffer(quadBufRef.current); quadBufRef.current = null }
      glRef.current = null
    }
  }, [canvas])

  // Effect 2: upload image texture
  useEffect(() => {
    const gl = glRef.current
    if (!gl || !image) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    gl.viewport(0, 0, canvas.width, canvas.height)

    if (imgTexRef.current) gl.deleteTexture(imgTexRef.current)

    const tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    imgTexRef.current = tex

    return () => {
      if (imgTexRef.current) { gl.deleteTexture(imgTexRef.current); imgTexRef.current = null }
    }
  }, [canvas, image])

  // Effect 3: upload LUT texture (cached per lutData object reference)
  useEffect(() => {
    const gl = glRef.current
    if (!gl || !lutData) return
    if (lutTextureCache.has(lutData)) return

    const { size, data } = lutData
    const tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_3D, tex)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    // Use RGBA8 (uint8) — always supported with LINEAR filtering, no extension needed.
    // Precision is 256 steps per channel, sufficient for LUT color grading.
    const u8 = new Uint8Array(size * size * size * 4)
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      u8[j]     = Math.round(data[i]     * 255)
      u8[j + 1] = Math.round(data[i + 1] * 255)
      u8[j + 2] = Math.round(data[i + 2] * 255)
      u8[j + 3] = 255
    }
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, u8)

    lutTextureCache.set(lutData, tex)
  }, [canvas, lutData])

  // Effect 4: draw call
  useEffect(() => {
    const gl = glRef.current
    const prog = progRef.current
    if (!gl || !prog || !image || !lutData) return

    const lutTex = lutTextureCache.get(lutData)
    if (!lutTex) return

    const u = uniformsRef.current
    gl.useProgram(prog)

    // Rebind buffer and attribute pointer (needed after canvas resize resets GL state)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBufRef.current)
    const aPos = gl.getAttribLocation(prog, 'aPosition')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, imgTexRef.current)
    gl.uniform1i(u.uImage, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_3D, lutTex)
    gl.uniform1i(u.uLUT, 1)

    gl.uniform1f(u.uLUTSize, lutData.size)
    gl.uniform1f(u.uExposure, exposure)
    gl.uniform1f(u.uIntensity, intensity ?? 1.0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }, [canvas, image, lutData, presetId, exposure, intensity])

  // Returns a function that forces a synchronous redraw — used before export
  return useCallback(() => {
    const gl = glRef.current
    const prog = progRef.current
    if (!gl || !prog || !image || !lutData) return

    const lutTex = lutTextureCache.get(lutData)
    if (!lutTex) return

    const u = uniformsRef.current
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBufRef.current)
    const aPos = gl.getAttribLocation(prog, 'aPosition')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, imgTexRef.current)
    gl.uniform1i(u.uImage, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_3D, lutTex)
    gl.uniform1i(u.uLUT, 1)
    gl.uniform1f(u.uLUTSize, lutData.size)
    gl.uniform1f(u.uExposure, exposure)
    gl.uniform1f(u.uIntensity, intensity ?? 1.0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.finish()
  }, [image, lutData, presetId, exposure, intensity])
}
