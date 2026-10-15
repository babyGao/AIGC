// node tools/model_preview.mjs <model.js> <EXPORT> <out.png> [scale] [overlay]
// 把母版画成干净线稿（overlay=1 时半透明叠在参考图上，用来对位）
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import url from 'url';
import { modelSVG } from '../film/shared/models/svgdraw.js';
const [modelPath, name, out, scaleS = '4', overlayS = '0'] = process.argv.slice(2);
const lib = await import(url.pathToFileURL(path.resolve(modelPath)).href), M = lib[name];
const sc = +scaleS, overlay = overlayS === '1';
const [x0, y0, x1, y1] = M.box, W = Math.round((x1 - x0) * sc), H = Math.round((y1 - y0) * sc);
const ref = 'data:image/webp;base64,' + fs.readFileSync(new URL('../assets/ref/fangyuan.webp', import.meta.url)).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">
<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fbfaf7"/>
${overlay ? `<image href="${ref}" x="0" y="0" width="1536" height="1024" opacity="0.9"/>` : ''}${modelSVG(M, lib, { overlay })}</svg>`;
fs.writeFileSync(out.replace(/\.png$/, '.svg'), svg);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.setContent(`<html><body style="margin:0">${svg}</body></html>`); await p.waitForTimeout(300);
await p.screenshot({ path: out }); await b.close(); console.log(out, W, H);
