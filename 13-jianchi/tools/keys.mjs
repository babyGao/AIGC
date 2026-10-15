// 导出关键镜头表（含该时刻的字幕）→ data/keys.json，供拼版用
import { KEYS, cueAt } from '../film/shared/story.js';
import fs from 'fs';
const out = KEYS.map(k => { const c = cueAt(k.t, true); return { ...k, line: k.cue || (c ? (c.who !== '旁白' ? c.who + '：' : '') + c.text : '') }; });
fs.writeFileSync(new URL('../data/keys.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(out.map(k => k.id + ' ' + k.line).join('\n'));
