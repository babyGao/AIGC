// node tools/ops_preview.mjs <model.js> <EXPORT> <out.png> [scale]
// 走 flatten（和成片同一条路：头的转动、parts、layers 都生效），用 svgdraw 的 opsSVG 画线稿
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import url from 'url';
import { opsSVG } from '../film/shared/models/svgdraw.js';
import { flatten, mkXf } from '../film/shared/models/flatten.js';
const [modelPath, name, out, scaleS = '1'] = process.argv.slice(2);
const lib = await import(url.pathToFileURL(path.resolve(modelPath)).href), M = lib[name];
const sc = +scaleS, [x0, y0, x1, y1] = M.box, W = Math.round((x1 - x0) * sc), H = Math.round((y1 - y0) * sc);
const ops = flatten(M, lib, mkXf({}));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fbfaf7"/>${opsSVG(ops, {})}</svg>`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.setContent(`<html><body style="margin:0">${svg}</body></html>`); await p.waitForTimeout(300);
await p.screenshot({ path: out }); await b.close(); console.log(out, W, H);
