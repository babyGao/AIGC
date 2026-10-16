// 入口：皮影戏一种风格。?lab=<名> 出试验页（?lab=pp&test=model|head|frame）；不带 lab 出成片画面（puppet/film.js）。render(t) 按成片时间出画
const q = new URLSearchParams(location.search);
const style = 'puppet', lab = q.get('lab');
const fonts = [['MSZ', 'fonts/MaShanZheng-Regular.ttf'], ['WK', 'fonts/LXGWWenKai-Medium.ttf'], ['ZK', 'fonts/ZCOOLQingKe-subset.woff2'], ['NS', 'fonts/NotoSansSC-Black-subset.woff2']];
await Promise.all(fonts.map(async ([n, u]) => { const f = new FontFace(n, `url(${u})`); await f.load(); document.fonts.add(f); }));
const mod = await import(lab ? `./lab/${lab}.js` : `./${style}/film.js`);
const cv = document.getElementById('c');
await (mod.init ? mod.init(cv, q) : null);
window.DUR = 216.29;
window.render = t => mod.render(cv, t, q);
window.READY = true;
