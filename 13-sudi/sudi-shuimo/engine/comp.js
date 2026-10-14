// 宣纸合成器（WebGL2），改写自 Lemo-Opuscar ink-wash demo 的 comp.js。
// 为了在没有 GPU 的机器上（SwiftShader 软渲染）也能逐帧渲染 263 秒，做了三处提速：
//   1. 纸纹、位移、颗粒全部来自一张启动时烘好的「可平铺噪声贴图」（RGBA 四种噪声），不在着色器里算 fbm；
//   2. 湿墨晕开用 mipmap 的 textureLod 近似模糊（8 次采样，替代原来的 24 次）；
//   3. 转场蒙版同样查噪声贴图。
// 每个画面三张 2D 画布：wet（湿墨：晕开 + 边缘积墨 + 颗粒）、dry（干墨：纸纹咬边）、col（颜色层：朱砂、夜里的纸色字）。
// 两套画面 A/B 之间的转场：tmode 0 = 墨晕（圆形扩散，前沿一圈水线），1 = 雾带横移（从左到右），2 = 雨水冲刷（从上到下），3 = 直接按 mix 混（只用于闪电这类一两帧的事）。
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0,1); }`;
const FS = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D wA, dA, cA, wB, dB, cB, NZ;
uniform vec2 res;
uniform vec3 paperX, paperXB;
uniform vec2 bleed, rim;
uniform vec4 trans; uniform float tmode;
uniform vec2 shake; uniform float flash, fade, vig, warm, dark;
uniform vec3 paperCol;
vec4 nz(vec2 p){ return texture(NZ, p / 1024.); }
vec3 paper(vec2 fc, vec3 X){
  vec2 p = (fc + X.xy) / X.z;
  float fine = clamp(X.z*1.2, 0., 1.);
  vec4 a = nz(p * .35), b = nz(p * 1.7 + 311.), c = nz(p * 4.1 + 97.);
  float cloud = a.r - .5, cloud2 = a.g - .5, grain = c.b - .5;
  float fb = b.a + c.a * .7;
  vec3 col = paperCol * (1. + cloud*.08 + cloud2*.035*fine + grain*.04*fine);
  col += vec3(.018,.016,.012) * fb * fine;
  col -= vec3(.012,.014,.018) * smoothstep(.62,.88, b.r) * fine * .8;
  return col;
}
float inkD(sampler2D W, sampler2D D, vec2 fc, float R, float rimK, vec3 X){
  vec2 p = (fc + X.xy) / X.z;
  vec4 n1 = nz(p * .8), n2 = nz(p * 3.3 + 51.);
  vec2 disp = (n1.rg - .5) * 1.6, feather = (n2.rb - .5);
  vec2 q = fc + disp * R * 1.1 + feather * R * .35;
  float l1 = log2(max(1., R * .55)), l2 = log2(max(1., R * 1.5));
  float a = 0., b = 0.;
  a += textureLod(W, (q + vec2( R*.35, R*.12)) / res, l1).a;
  a += textureLod(W, (q + vec2(-R*.3,  R*.3 )) / res, l1).a;
  a += textureLod(W, (q + vec2(-R*.1, -R*.38)) / res, l1).a;
  a += textureLod(W, (q + vec2( R*.28,-R*.25)) / res, l1).a;
  b += textureLod(W, (q + vec2( R*.95, R*.4 )) / res, l2).a;
  b += textureLod(W, (q + vec2(-R*.9,  R*.6 )) / res, l2).a;
  b += textureLod(W, (q + vec2(-R*.35,-R*1.1)) / res, l2).a;
  b += textureLod(W, (q + vec2( R*.8, -R*.8 )) / res, l2).a;
  a *= .25; b *= .25;
  float s0 = texture(W, q / res).a;
  float edge = max(0., a - b);
  float g1 = n2.b, g2 = n1.g;
  float wet = mix(s0, a, .7) * (.86 + .22*g2) + edge * rimK * (.8 + .5*g1) + b * .10;
  vec2 j = (n2.ga - .5);
  float dry = texture(D, (fc + j * 1.6) / res).a;
  float tooth = smoothstep(.6, .9, n2.r) * .45;
  dry *= 1. - tooth * (1. - dry*.5);
  return clamp(1. - (1. - clamp(wet,0.,1.)) * (1. - clamp(dry,0.,1.)), 0., 1.);
}
vec3 inkCol(float D){ return mix(vec3(.52,.55,.58), vec3(.075,.068,.062), smoothstep(.0, .85, D)); }
vec3 shade(vec3 pc, float D, vec4 col, vec2 fc, vec3 X){
  vec3 c = pc * mix(vec3(1.), inkCol(D), clamp(D*1.05, 0., 1.));
  vec2 p = (fc + X.xy) / X.z;
  float sp = smoothstep(.2, .45, nz(p * 2.2 + 11.).b) * .25 + .75;
  c = mix(c, col.rgb / max(col.a, .001) * (pc / paperCol), col.a * sp);
  return c;
}
void main(){
  vec2 fc = gl_FragCoord.xy; fc.y = res.y - fc.y; fc += shake;
  vec3 pa = paper(fc, paperX);
  float DA = inkD(wA, dA, fc, bleed.x, rim.x, paperX);
  vec4 CA = texture(cA, fc / res);
  vec3 c = shade(pa, DA, CA, fc, paperX);
  if (trans.w > .5) {
    vec3 pb = paper(fc, paperXB);
    float DB = inkD(wB, dB, fc, bleed.y, rim.y, paperXB);
    vec4 CB = texture(cB, fc / res);
    vec3 cb = shade(pb, DB, CB, fc, paperXB);
    vec4 tn = nz(fc * .55 + 700.), tn2 = nz(fc * 2.3 + 123.);
    float n = tn.r * .7 + tn2.g * .25;
    float m, band;
    if (tmode < .5) {            // 墨晕：圆形扩散 + 前沿水线
      float dn = length(fc - trans.xy) * (.72 + n);
      m = 1. - smoothstep(trans.z*.9, trans.z, dn);
      band = exp(-pow((dn - trans.z*.95)/(trans.z*.05 + 14.), 2.)) * .6 * smoothstep(0., 40., trans.z) * (1. - smoothstep(res.x*1.1, res.x*1.5, trans.z));
    } else if (tmode < 1.5) {    // 雾带横移：前沿是一条起伏的雾，雾里纸色略提亮
      float x = fc.x + (n - .45) * 420. + sin(fc.y * .004 + trans.y) * 60.;
      m = 1. - smoothstep(trans.z - 260., trans.z + 40., x);
      band = 0.;
      float fog = exp(-pow((x - trans.z + 110.) / 230., 2.)) * .85;
      c = mix(c, pa, fog); cb = mix(cb, pb, fog);
    } else if (tmode < 2.5) {    // 雨水冲刷：从上往下，前沿拖出竖向的水痕
      float y = fc.y + (tn2.r - .5) * 140. + (nz(vec2(fc.x * .9, fc.y * .03)).g - .5) * 220. + (nz(vec2(fc.x * 2.4, 7.)).b - .5) * 70.;
      m = 1. - smoothstep(trans.z - 150., trans.z + 40., y);
      band = exp(-pow((y - trans.z) / 50., 2.)) * .3;
    } else { m = trans.z; band = 0.; }
    c = mix(c, cb, m);
    c *= 1. - band * .38;
  }
  vec2 uv = gl_FragCoord.xy / res - .5;
  c *= 1. - vig * dot(uv*vec2(1.,.9), uv*vec2(1.,.9)) * 1.2;
  c = mix(c, c * vec3(1.02, .99, .94), warm);
  c *= 1. - dark;
  c = mix(c, paperCol * 1.04, flash);
  c = mix(c, vec3(0.), fade);
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

// 可平铺值噪声（周期 per 格），返回 Float32Array(S*S)
function tileNoise(S, per, seed) {
  const g = new Float32Array(per * per);
  let s = seed >>> 0; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < g.length; i++) g[i] = R();
  const out = new Float32Array(S * S), k = per / S;
  for (let y = 0; y < S; y++) {
    const fy = y * k, iy = Math.floor(fy), ty = fy - iy, uy = ty * ty * (3 - 2 * ty), y0 = iy % per, y1 = (iy + 1) % per;
    for (let x = 0; x < S; x++) {
      const fx = x * k, ix = Math.floor(fx), tx = fx - ix, ux = tx * tx * (3 - 2 * tx), x0 = ix % per, x1 = (ix + 1) % per;
      const a = g[y0 * per + x0], b = g[y0 * per + x1], c = g[y1 * per + x0], d = g[y1 * per + x1];
      out[y * S + x] = (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
    }
  }
  return out;
}
function fbmTile(S, per0, oct, seed) {
  const out = new Float32Array(S * S); let w = .5, tot = 0;
  for (let o = 0; o < oct; o++) { const n = tileNoise(S, per0 << o, seed + o * 101); for (let i = 0; i < out.length; i++) out[i] += n[i] * w; tot += w; w *= .5; }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
// 纤维：横向拉长的噪声取高值
function fiberTile(S, seed) {
  const out = new Float32Array(S * S);
  const a = tileNoise(S, 8, seed), b = tileNoise(S, 256, seed + 7), c = tileNoise(S, 128, seed + 9);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // 方向一：横向长纤维（x 低频 × y 高频）
    const i = y * S + x, ax = a[(Math.floor(y / 2) % S) * S + x] * .0 + b[i];
    const v = Math.max(0, (b[((y * 3) % S) * S + Math.floor(x / 4)] - .72) / .2) * .8 + Math.max(0, (c[((x * 2) % S) * S + Math.floor(y / 5)] - .75) / .2) * .6;
    out[i] = Math.min(1, v + ax * 0);
  }
  return out;
}
export function makeNoiseTex(S = 1024) {
  const r = fbmTile(S, 4, 5, 11), g = fbmTile(S, 16, 4, 23), b = tileNoise(S, 512, 37), a = fiberTile(S, 41);
  const px = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) { px[i * 4] = r[i] * 255; px[i * 4 + 1] = g[i] * 255; px[i * 4 + 2] = b[i] * 255; px[i * 4 + 3] = a[i] * 255; }
  return { S, px };
}

export function makeComp(canvas) {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('no webgl2');
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const names = ['wA', 'dA', 'cA', 'wB', 'dB', 'cB', 'NZ'];
  const tex = names.map((n, i) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
    const mip = n[0] === 'w';
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = n === 'NZ' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(U(n), i); return t;
  });
  const NZT = makeNoiseTex(1024);
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, tex[6]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NZT.S, NZT.S, 0, gl.RGBA, gl.UNSIGNED_BYTE, NZT.px);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D);
  const up = (i, cv) => {
    gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    if (names[i][0] === 'w') gl.generateMipmap(gl.TEXTURE_2D);
  };
  const W = canvas.width, H = canvas.height;
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  return function composite(A, B, o = {}) {
    gl.viewport(0, 0, W, H);
    up(0, A.wet); up(1, A.dry); up(2, A.col);
    const tr = o.trans || [0, 0, 0, 0];
    if (B && tr[3] > .5) { up(3, B.wet); up(4, B.dry); up(5, B.col); }
    gl.uniform2f(U('res'), W, H);
    const px = o.paper || [0, 0, 1], pxb = o.paperB || [0, 0, 1];
    gl.uniform3f(U('paperX'), px[0], px[1], px[2]); gl.uniform3f(U('paperXB'), pxb[0], pxb[1], pxb[2]);
    gl.uniform2f(U('bleed'), o.bleed ?? 6, o.bleedB ?? 6);
    gl.uniform2f(U('rim'), o.rim ?? .8, o.rimB ?? .8);
    gl.uniform4f(U('trans'), tr[0], tr[1], tr[2], tr[3]); gl.uniform1f(U('tmode'), o.tmode ?? 0);
    const sk = o.shake || [0, 0]; gl.uniform2f(U('shake'), sk[0], sk[1]);
    gl.uniform1f(U('flash'), o.flash ?? 0); gl.uniform1f(U('fade'), o.fade ?? 0); gl.uniform1f(U('dark'), o.dark ?? 0);
    gl.uniform1f(U('vig'), o.vig ?? .22); gl.uniform1f(U('warm'), o.warm ?? .5);
    const pc = o.paperCol || [.95, .925, .87]; gl.uniform3f(U('paperCol'), pc[0], pc[1], pc[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

// 一套三张画布
export function layerSet(W = 1920, H = 1080) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const wet = mk(), dry = mk(), col = mk();
  const L = { wet, dry, col, W, H, cw: wet.getContext('2d'), cd: dry.getContext('2d'), cc: col.getContext('2d') };
  L.ink = { wet: L.cw, dry: L.cd, col: L.cc };
  L.clear = () => { for (const c of [L.cw, L.cd, L.cc]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, W, H); } };
  L.xf = (s, tx, ty, rot = 0) => { for (const c of [L.cw, L.cd, L.cc]) { c.setTransform(s, 0, 0, s, tx, ty); if (rot) { c.translate(960, 540); c.rotate(rot); c.translate(-960, -540); } } };
  L.reset = () => { for (const c of [L.cw, L.cd, L.cc]) c.setTransform(1, 0, 0, 1, 0, 0); };
  return L;
}
