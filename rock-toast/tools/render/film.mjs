// 渲染与检查
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const opt = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lib = path.resolve(process.env.LIB || path.join(root, '../lemo-opuscar'));
const require = createRequire(path.join(lib, 'package.json'));
const { chromium } = require('playwright-core');
const { serve } = await import(pathToFileURL(path.join(lib, 'core/render/serve.mjs')));
const sid = opt('--shot', 's09'), fps = +opt('--fps', 60);
const start = +opt('--start', 0), limit = +opt('--frames', 0);
const out = path.resolve(root, opt('--out', `paint/out/${sid}.mp4`));
const pending = out + `.${process.pid}.pending.mp4`, lock = out + '.lock';
const project = path.resolve(opt('--project', root));
const cacheable = !args.includes('--times') && !start && !limit;
const hash = createHash('sha256');
for (const name of fs.readdirSync(path.join(project, 'paint/src')).filter(n => n.endsWith('.js')).sort())
  hash.update(fs.readFileSync(path.join(project, 'paint/src', name)));
for (const name of ['film.json', 'keys.json']) hash.update(fs.readFileSync(path.join(project, 'paint', name)));
const cacheDir = path.join(project, 'paint/cache', sid);
for (const name of fs.readdirSync(cacheDir).sort()) { const s = fs.statSync(path.join(cacheDir, name)); hash.update(`${name}:${s.size}:${s.mtimeMs}`); }
hash.update(`${fps}:${opt('--ss', 2)}`); const signature = hash.digest('hex');
const reused = () => {
  if (!cacheable) return false;
  try {
    const record = JSON.parse(fs.readFileSync(out + '.render.json', 'utf8'));
    const outputHash = createHash('sha256').update(fs.readFileSync(out)).digest('hex');
    if (record.signature !== signature || record.outputHash !== outputHash
      || (record.page || 'paint/index.html') !== opt('--page', 'paint/index.html')) return false;
    console.log(JSON.stringify({ sid, reused: true, frames: record.frames, out })); return true;
  } catch { return false; }
};
if (reused()) process.exit(0);
fs.mkdirSync(path.dirname(out), { recursive: true });
let lockHeld = false;
if (cacheable) while (!lockHeld) {
  try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); lockHeld = true; }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(fs.readFileSync(lock, 'utf8')); let alive = Number.isInteger(pid) && pid > 0;
    if (!alive && Date.now() - fs.statSync(lock).mtimeMs < 5000) {
      await new Promise(resolve => setTimeout(resolve, 100)); continue;
    }
    if (alive) try { process.kill(pid, 0); } catch { alive = false; }
    if (!alive) { fs.unlinkSync(lock); continue; }
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (reused()) process.exit(0);
  }
}
const { server, port } = await serve(project);
let browser, ff;
const errors = [];
try {
  browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROME ? { executablePath: process.env.PLAYWRIGHT_CHROME } : {}),
    args: ['--enable-gpu', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/${opt('--page', 'paint/index.html')}?shot=${sid}&ss=${opt('--ss', 2)}`);
  await page.waitForFunction(() => window.READY, { timeout: 180000 });
  const dur = await page.evaluate(() => window.DUR);
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('#gl').getContext('webgl2'), e = gl.getExtension('WEBGL_debug_renderer_info');
    return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (args.includes('--times')) {
    const times = opt('--times', '0').split(',').map(Number).sort((a, b) => a - b);
    const stats = [];
    let warm = 0;
    for (const t of times) {
      const step = +opt('--warm-step', 0);
      if (step > 0) while (warm < t - 1e-8) { await page.evaluate(t => window.render(t), warm); warm += step; }
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: out.replace(/\.[^.]+$/, '') + `-${t.toFixed(5)}.png` });
      stats.push({ t, ...await page.evaluate(() => ({ ...window.STATS,
        glError: document.querySelector('#gl').getContext('webgl2').getError() })) });
      fs.writeFileSync(out + '.json', JSON.stringify({ sid, renderer, stats }, null, 2));
      console.log(JSON.stringify(stats.at(-1)));
    }
    if (errors.length || stats.some(s => s.glError)) throw new Error(JSON.stringify({ errors, stats }));
    fs.writeFileSync(out + '.json', JSON.stringify({ sid, renderer, stats }, null, 2));
    console.log(JSON.stringify({ sid, renderer, captures: times.length }));
  } else {
    ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps),
      '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium',
      '-pix_fmt', 'yuv420p', pending], { stdio: ['pipe', 'inherit', 'inherit'] });
    let failure = null;
    const done = new Promise(resolve => { ff.on('error', e => { failure = e; resolve(-1); }); ff.on('close', resolve); });
    ff.stdin.on('error', e => { failure = e; });
    const total = limit || Math.round((dur - start) * fps);
    const began = Date.now();
    for (let i = 0; i < total; i++) {
      if (failure) throw failure;
      await page.evaluate(t => window.render(t), start + i / fps);
      const image = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(image)) await Promise.race([once(ff.stdin, 'drain'), done]);
      if (i % 60 === 0) console.log(`${sid} ${i}/${total} ${((Date.now() - began) / 1000).toFixed(1)}s`);
    }
    ff.stdin.end(); const code = await done;
    const glError = await page.evaluate(() => document.querySelector('#gl').getContext('webgl2').getError());
    if (code !== 0 || errors.length || glError) throw new Error(JSON.stringify({ code, errors, glError }));
    fs.renameSync(pending, out);
    if (cacheable) fs.writeFileSync(out + '.render.json', JSON.stringify({ signature, frames: total, page: opt('--page', 'paint/index.html'),
      outputHash: createHash('sha256').update(fs.readFileSync(out)).digest('hex') }, null, 2));
    console.log(JSON.stringify({ sid, renderer, frames: total, seconds: (Date.now() - began) / 1000, out }));
  }
} finally {
  if (ff && ff.exitCode === null) ff.kill();
  await browser?.close(); server.close();
  if (fs.existsSync(pending)) fs.unlinkSync(pending);
  if (lockHeld) fs.unlinkSync(lock);
}
