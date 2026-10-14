// 设计稿页面：?test=glyph&p=0 看字形网格（描骨架用）
export function render(t, A, B, TMP, comp, mode, q) {
  A.clear();
  if (mode === 'glyph') {
    const chars = '丹木火土金水', p = +(q.get('p') || 0), c = A.cc;
    for (let i = 0; i < 2; i++) {
      const ch = chars[p * 2 + i]; if (!ch) continue;
      const x0 = 110 + i * 900, y0 = 130, S = 800;
      c.strokeStyle = 'rgba(200,0,0,.35)'; c.lineWidth = 1;
      for (let k = 0; k <= 20; k++) { c.globalAlpha = k % 2 ? .4 : 1; c.beginPath(); c.moveTo(x0 + k * 40, y0); c.lineTo(x0 + k * 40, y0 + S); c.stroke(); c.beginPath(); c.moveTo(x0, y0 + k * 40); c.lineTo(x0 + S, y0 + k * 40); c.stroke(); }
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(0,0,0,.75)'; c.font = `${S}px MaShanZheng`; c.textBaseline = 'alphabetic'; c.textAlign = 'center';
      const m = c.measureText(ch);
      c.fillText(ch, x0 + S / 2, y0 + S / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
      c.fillStyle = 'red'; c.font = '20px sans-serif'; for (let k = 0; k <= 10; k++) { c.fillText(k * 10, x0 - 22, y0 + k * 80 + 6); c.fillText(k * 10, x0 + k * 80, y0 - 8); }
    }
    comp(A, null, { bleed: 1 }); return;
  }
}
