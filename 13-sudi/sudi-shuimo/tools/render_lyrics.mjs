// 单独渲染卡拉 OK 歌词层（透明背景 → qtrle .mov，带 alpha），再用 ffmpeg 叠到画面上。
// 用法（在 lemo-opuscar 库根目录运行）：node <project>/tools/render_lyrics.mjs <project> [--workers 3]
import fs from 'fs'; import path from 'path'; import { spawn, execFileSync } from 'child_process';
const LIB = process.env.LIB || path.join(process.env.HOME, 'lemo-opuscar');
const { openDemo, closeServer } = await import(path.join(LIB, 'core/render/page.mjs'));
const dir = path.resolve(process.argv[2]), WK = +(process.argv[process.argv.indexOf('--workers') + 1] || 3) || 3, FPS = 24;
const out = process.argv.includes('--out') ? path.resolve(process.argv[process.argv.indexOf('--out') + 1]) : path.join(dir, 'out', 'lyrics.mov'), seg = path.join(dir, 'out', '.lyr_segs'); fs.rmSync(seg, { recursive: true, force: true }); fs.mkdirSync(seg, { recursive: true });
const probe = await openDemo(dir, { q: 'lyr=1' }); const DUR = await probe.page.evaluate(() => window.DUR); await probe.browser.close();
const RG = process.argv.includes('--range') ? process.argv[process.argv.indexOf('--range') + 1].split(':').map(Number) : [0, DUR];
const F0 = Math.round(RG[0] * FPS), TOTAL = Math.round(RG[1] * FPS) - F0, per = Math.ceil(TOTAL / WK), t0 = Date.now();
await Promise.all([...Array(WK)].map(async (_, w) => {
  const a = w * per, b = Math.min(TOTAL, a + per); if (a >= b) return;
  const { browser, page } = await openDemo(dir, { q: 'lyr=1' });
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'qtrle', '-pix_fmt', 'argb', `seg_${w}.mov`], { cwd: seg, stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise(r => ff.on('close', r));
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.render(t), (F0 + f) / FPS);
    const buf = await page.screenshot({ type: 'png', omitBackground: true });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 600 === 0) console.log(`w${w} ${f - a}/${b - a} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await done; await browser.close();
}));
fs.writeFileSync(path.join(seg, 'list.txt'), [...Array(WK)].map((_, w) => `file 'seg_${w}.mov'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', out], { cwd: seg, stdio: 'inherit' });
fs.rmSync(seg, { recursive: true, force: true });
console.log('done', out, TOTAL, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
closeServer(); process.exit(0);
