# 坚持 · 逐帧渲染器
#   python3 film/render.py [--shots 3,4,5] [--still 12.3] [--jobs 4]
# 每个镜头单独编码成 out/segs/NNN.mp4，最后 film/assemble.sh 拼接成片。
import cv2, numpy as np, os, sys, json, math, subprocess, argparse
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manga import manga, to_paper, spot
cv2.setNumThreads(2)
import fx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS = 1920, 1080, 30
DUR = 216.293628
OPEN_T = 204.68                       # 光芒骤放：遮幅撑开到满画幅
BAR = int(round(H * (1 - (16 / 9) / 2.39) / 2))   # 2.39:1 遮幅高度 ≈138px
CUES = json.load(open(os.path.join(ROOT, 'data/cues.json')))['cues']
VID = {'Z': 'BV1zLNd6ME7B', 'P': 'BV1PGp26cExn', 'B': 'BV19pC9BEE4j'}

# 原视频烧录的字幕与水印所在区域（归一化 x0,y0,x1,y1）——修补掉
CLEAN = {
    'Z': [(0.18, 0.875, 0.82, 0.975)],
    'P': [(0.18, 0.895, 0.82, 1.0), (0.80, 0.0, 1.0, 0.085), (0.0, 0.0, 0.16, 0.06)],
    'B': [(0.12, 0.83, 0.88, 0.985), (0.0, 0.88, 0.22, 1.0)],
}

def ease(u, kind='inout'):
    u = min(max(u, 0.0), 1.0)
    if kind == 'lin': return u
    if kind == 'out': return 1 - (1 - u) ** 3
    if kind == 'in': return u ** 3
    if kind == 'expo': return 1 - 2 ** (-10 * u) if u < 1 else 1.0
    return 0.5 - 0.5 * math.cos(math.pi * u)

def lerp(a, b, u): return a + (b - a) * u

def noise1(t, seed, freq):
    # 平滑噪声（几组正弦叠加），给手持晃动用
    r = np.random.default_rng(seed); ph = r.uniform(0, 6.28, 4); fr = r.uniform(0.6, 1.4, 4) * freq
    return float(sum(np.sin(t * fr[i] * 6.283 + ph[i]) / (i + 1) for i in range(4)) / 2.08)

# ---------------- 素材 ----------------
class Clip:
    def __init__(self, key, a, b):
        self.key, self.a, self.b = key, a, b
        cap = cv2.VideoCapture(os.path.join(ROOT, 'sucai/videos', VID[key] + '.mp4'))
        self.fps = cap.get(cv2.CAP_PROP_FPS)
        cap.set(cv2.CAP_PROP_POS_MSEC, a * 1000)
        n = int((b - a) * self.fps) + 2
        self.frames = []
        for _ in range(n):
            ok, f = cap.read()
            if not ok: break
            self.frames.append(f)
        self.clean_cache, self.mask_cache = {}, {}
        if not self.frames: raise RuntimeError(f'no frames {key} {a}')

    def get(self, i):
        i = int(min(max(i, 0), len(self.frames) - 1))
        if i not in self.clean_cache:
            f = self.frames[i].copy(); h, w = f.shape[:2]
            for x0, y0, x1, y1 in CLEAN[self.key]:
                X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
                sub = f[Y0:Y1, X0:X1]
                hsv = cv2.cvtColor(sub, cv2.COLOR_BGR2HSV)
                m = ((hsv[..., 2] > 165) & (hsv[..., 1] < 70)).astype(np.uint8) * 255
                # 只修补“字形”大小的亮斑（细笔画），不碰大片浪花
                th = cv2.morphologyEx(m, cv2.MORPH_TOPHAT, np.ones((15, 15), np.uint8))
                th = cv2.dilate(th, np.ones((7, 7), np.uint8))
                if th.any(): f[Y0:Y1, X0:X1] = cv2.inpaint(sub, th, 5, cv2.INPAINT_TELEA)
            self.clean_cache[i] = f
        return self.clean_cache[i], i

    def mask(self, i):
        if i not in self.mask_cache:
            import seg
            self.mask_cache[i] = seg.mask(self.get(i)[0], 'u2net_human_seg')
        return self.mask_cache[i]

# ---------------- 运镜 ----------------
def cam_state(cam, tr, dur):
    """tr: 镜头内秒数。返回 z, cx, cy, rot, dx, dy, blur"""
    cam = cam or {}
    u = tr / max(dur, 1e-6); e = ease(u, cam.get('ease', 'inout'))
    z0, z1 = cam.get('z', (1.06, 1.12))
    (x0, y0), (x1, y1) = cam.get('c', ((0.5, 0.5), (0.5, 0.5)))
    r0, r1 = cam.get('r', (0, 0))
    z = lerp(z0, z1, e); cx = lerp(x0, x1, e); cy = lerp(y0, y1, e); rot = lerp(r0, r1, e); blur = 0.0
    if 'crash' in cam:                      # 急推：在 at 处用 dur 秒从 z0 冲到 z1×k
        at, cd, k = cam['crash']
        if tr >= at:
            p = min((tr - at) / cd, 1.0); z = z * lerp(1.0, k, ease(p, 'expo'))
            blur = (1 - p) * 0.12 * (k - 1) if p < 1 else 0.0
    if 'snap' in cam:                       # 跳焦：瞬间切到 k 倍（漫画格的“推近一格”）
        for at, k in cam['snap']:
            if tr >= at: z *= k
    dx = dy = 0.0
    a = cam.get('shake', 0)                 # 手持
    if a: dx += noise1(tr, 11, 0.7) * a; dy += noise1(tr, 23, 0.6) * a * 0.7; rot += noise1(tr, 5, 0.4) * a * 0.02
    for at, amp, dec in cam.get('hit', []): # 冲击震动：高频、指数衰减
        if tr >= at:
            k = math.exp(-(tr - at) / dec) * amp
            dx += k * math.sin((tr - at) * 97); dy += k * math.cos((tr - at) * 83)
    return z, cx, cy, rot, dx, dy, blur

def warp_M(sw, sh, size, z, cx, cy, rot, dx, dy):
    Wt, Ht = size
    s = max(Wt / sw, Ht / sh) * z
    s *= 1 + abs(math.sin(math.radians(rot))) * 0.9    # 转动时自动补放大，不露边
    hx, hy = Wt / (2 * s), Ht / (2 * s)
    px = min(max(cx * sw, hx), sw - hx) if 2 * hx < sw else sw / 2
    py = min(max(cy * sh, hy), sh - hy) if 2 * hy < sh else sh / 2
    a = math.radians(rot); c, si = math.cos(a) * s, math.sin(a) * s
    M = np.float32([[c, -si, 0], [si, c, 0]])
    M[:, 2] = np.float32([Wt / 2 + dx, Ht / 2 + dy]) - M[:, :2] @ np.float32([px, py])
    return M

def render_view(clip, idx, cs, size, tone, need_mask=False, vertigo=None, u=0.0):
    src, i = clip.get(idx); sh, sw = src.shape[:2]
    z, cx, cy, rot, dx, dy, blur = cs
    M = warp_M(sw, sh, size, z, cx, cy, rot, dx, dy)
    mk = None
    if vertigo:                             # 希区柯克变焦：人物大小不变，背景纵深推拉
        zf0, zf1, zb0, zb1 = vertigo; e = ease(u)
        m = clip.mask(i); md = cv2.dilate((m > 0.3).astype(np.float32), np.ones((25, 25), np.uint8))
        keep = (1 - md)[..., None]
        fill = cv2.blur(src.astype(np.float32) * keep, (61, 61)) / (cv2.blur(keep, (61, 61))[..., None] + 1e-4)
        bg = (src * keep + fill * (1 - keep)).astype(np.uint8)
        Mb = warp_M(sw, sh, size, lerp(zb0, zb1, e), cx, cy, rot, dx, dy)
        Mf = warp_M(sw, sh, size, lerp(zf0, zf1, e), cx, cy, rot, dx, dy)
        B = cv2.warpAffine(bg, Mb, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        F = cv2.warpAffine(src, Mf, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        mk = cv2.warpAffine(m, Mf, size, flags=cv2.INTER_LINEAR)
        img = (F * mk[..., None] + B * (1 - mk[..., None])).astype(np.uint8)
    else:
        img = cv2.warpAffine(src, M, size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        if need_mask: mk = cv2.warpAffine(clip.mask(i), M, size, flags=cv2.INTER_LINEAR)
    t = dict(tone or {}); t.pop('past', None); t.pop('paper', None)
    ink = manga(img, **t)
    if blur > 0.002: ink = fx.zoom_blur(ink, size[0] / 2, size[1] / 2, blur)
    return ink, img, mk

# ---------------- 单帧 ----------------
def active(f, tr):
    at = f.get('at', 0.0); d = f.get('dur', 1e9)
    return at <= tr < at + d, (tr - at) / d if d < 1e8 else tr - at

def apply_ink_fx(ink, fxs, tr, fi, mk, size):
    Wt, Ht = size
    for f in fxs:
        on, p = active(f, tr)
        if not on: continue
        k = f['k']; seed = f.get('seed', 0) + (fi // 2 if f.get('boil', True) else 0)
        if k == 'radial':
            cx, cy = f.get('cx', 0.5) * Wt, f.get('cy', 0.5) * Ht
            rx, ry = f.get('rx', 0.3) * Wt, f.get('ry', 0.3) * Ht
            if f.get('focus') and mk is not None:      # 一拳超人式：人物留下，背景换成白底集中线
                bg = fx.radial_lines(np.ones_like(ink), cx, cy, rx, ry, f.get('n', 190), seed, f.get('w', 1.2))
                m = np.clip((mk - 0.35) * 3, 0, 1)
                edge = np.clip(cv2.dilate(m, np.ones((9, 9), np.uint8)) - m, 0, 1)
                ink = ink * m + bg * (1 - m); ink = ink * (1 - edge)
            else:
                ink = fx.radial_lines(ink, cx, cy, rx, ry, f.get('n', 150), seed, f.get('w', 1.0), f.get('color', 0.0))
        elif k == 'silhouette' and mk is not None:
            m = np.clip((mk - 0.35) * 3, 0, 1)
            bg = fx.radial_lines(np.ones_like(ink), f.get('cx', 0.5) * Wt, f.get('cy', 0.5) * Ht, f.get('rx', 0.25) * Wt, f.get('ry', 0.3) * Ht, 220, seed, 1.4)
            ink = bg * (1 - m)
        elif k == 'parallel':
            ink = fx.parallel_lines(ink, f.get('angle', 0), f.get('n', 80), seed, f.get('band'), f.get('color', 0.0))
        elif k == 'gloom':
            ink = fx.gloom_lines(ink, f.get('depth', 0.45), f.get('n', 110), f.get('seed', 3))
        elif k == 'rings':
            ink = fx.rings(ink, f.get('cx', 0.5) * Wt, f.get('cy', 0.5) * Ht, (tr * f.get('speed', 0.8)) % 1.0, f.get('n', 4), seed=f.get('seed', 1), thick=f.get('thick', 12))
        elif k == 'lightning' and mk is not None:
            ink = fx.lightning(ink, mk, f.get('n', 6), seed, f.get('reach', 0.25), f.get('thick', 7))
        elif k == 'particles':
            ink = fx.particles(ink, tr * f.get('speed', 0.25), f.get('n', 140), f.get('seed', 2), f.get('area', (0.2, 0.2, 0.8, 0.9)), f.get('rise', 0.35))
        elif k == 'ripples':
            ink = fx.ripples(ink, f.get('cx', 0.5) * Wt, f.get('cy', 0.8) * Ht, (tr * f.get('speed', 0.5)) % 1.0)
        elif k == 'invert':
            ink = 1 - ink
        elif k == 'flatwhite':                       # 冲击帧：只剩人物墨线，背景全白
            if mk is not None: ink = np.maximum(ink, 1 - np.clip((mk - 0.3) * 3, 0, 1))
    return ink

def apply_rgb_fx(img, fxs, tr, fi, size, src_img):
    Wt, Ht = size
    for f in fxs:
        on, p = active(f, tr)
        if not on: continue
        k = f['k']
        if k == 'flash':
            img = fx.white(img, (1 - p) ** 2 * f.get('a', 1.0))
        elif k == 'fadein':
            img = fx.black(img, 1 - ease(p, 'lin')) if f.get('color', 'black') == 'black' else fx.white(img, 1 - p)
        elif k == 'fadeout':
            img = fx.black(img, ease(p, 'lin')) if f.get('color', 'black') == 'black' else fx.white(img, ease(p, 'lin'))
        elif k == 'burst':
            curve = f.get('curve', 'up')
            a = ease(p, 'out') if curve == 'up' else (1 - p) if curve == 'down' else math.sin(math.pi * p)
            img = fx.light_burst(img, f.get('cx', 0.5) * Wt, f.get('cy', 0.5) * Ht, a * f.get('a', 1.0), seed=f.get('seed', 0) + fi // 3, power=f.get('power', 1.0))
        elif k == 'spot':
            img = spot(src_img, img, f['h'][0], f['h'][1], f.get('s', 70), f.get('v', 60), f.get('col'), f.get('a', 1.0))
        elif k == 'tint':                             # 整体专色（如湛蓝光）
            col = np.array(f['col'], np.float32)[None, None]
            a = f.get('a', 0.5) * (math.sin(math.pi * p) if f.get('pulse') else 1)
            lum = img.astype(np.float32) / 255
            img = (img.astype(np.float32) * (1 - a) + lum * col * a).clip(0, 255).astype(np.uint8)
        elif k == 'sfx':
            ttl = tr - f.get('at', 0)
            pop = f.get('pop', 0.12)
            sc = f.get('scale', 1.0) * (lerp(1.8, 1.0, ease(ttl / pop, 'out')) if ttl < pop else 1.0)
            if f.get('grow'): sc *= 1 + ttl * f['grow']
            a = 1.0
            fo = f.get('fade', 0.0)
            if fo and p > 1 - fo: a = (1 - p) / fo
            jx = jy = 0
            if f.get('shake', 0):
                jx = math.sin(fi * 2.3) * f['shake']; jy = math.cos(fi * 3.1) * f['shake']
            im = fx.sfx_img(f['text'], f.get('size', 220), vertical=f.get('vertical', False),
                            fill=tuple(f.get('fill', (10, 10, 12))), stroke=tuple(f.get('stroke', (250, 250, 250))))
            img = fx.paste_rgba(img, im, f.get('x', 0.5) * Wt + jx, f.get('y', 0.5) * Ht + jy, sc, f.get('rot', 0), a)
    return img

def paper_of(ink, tone):
    if tone and tone.get('past'):           # 回忆：暖黄纸、褐墨、没有死黑（诺兰的主观/客观两套画法）
        ink = 0.18 + 0.82 * ink
        return to_paper(ink, tint=(178, 214, 236), inkcol=(30, 44, 70))
    return to_paper(ink)

def render_panel_frame(shot, tr, fi, clips):
    """漫画分格：白纸 + 黑框 + 每格各自的素材与运镜。"""
    img = np.full((H, W, 3), 238, np.uint8)
    latest = max([k for k, p in enumerate(shot['panels']) if tr >= p.get('at', 0)] or [0])
    for k, p in enumerate(shot['panels']):
        at = p.get('at', 0)
        if tr < at: continue
        poly = (np.array(p['poly'], np.float32) * [W, H])
        x0, y0 = poly.min(0); x1, y1 = poly.max(0)
        x0, y0, x1, y1 = int(max(0, x0)), int(max(0, y0)), int(min(W, x1)), int(min(H, y1))
        size = (x1 - x0, y1 - y0)
        ptr = tr - at; pdur = shot['t1'] - shot['t0'] - at
        clip = clips[k]
        n_src = len(clip.frames)
        spd = p.get('speed', min(1.0, (n_src / clip.fps - 0.05) / max(pdur, 0.1)))
        idx = int(ptr * spd * clip.fps / 2) * 2
        cs = cam_state(p.get('cam'), ptr, pdur)
        need = any(f['k'] in ('radial', 'silhouette', 'lightning', 'flatwhite') and f.get('focus', True) for f in p.get('fx', []))
        ink, src_img, mk = render_view(clip, idx, cs, size, p.get('tone'), need)
        ink = apply_ink_fx(ink, p.get('fx', []), ptr, fi, mk, size)
        sub = paper_of(ink, p.get('tone'))
        sub = apply_rgb_fx(sub, p.get('fx', []), ptr, fi, size, src_img)
        if shot.get('dim') and k != latest: sub = fx.white(sub, 0.45)
        # 入格：从 1.12 倍缩回，像拍下来的一格
        if ptr < 0.15:
            s = lerp(1.12, 1.0, ease(ptr / 0.15, 'out'))
            Mz = cv2.getRotationMatrix2D((size[0] / 2, size[1] / 2), 0, s)
            sub = cv2.warpAffine(sub, Mz, size, borderMode=cv2.BORDER_REFLECT)
        m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [poly.astype(np.int32)], 255, cv2.LINE_AA)
        mm = (m[y0:y1, x0:x1].astype(np.float32) / 255)[..., None]
        img[y0:y1, x0:x1] = (img[y0:y1, x0:x1] * (1 - mm) + sub * mm).astype(np.uint8)
        cv2.polylines(img, [poly.astype(np.int32)], True, (14, 12, 16), 9, cv2.LINE_AA)
        if ptr < 0.08: img = fx.white(img, 0.5 * (1 - ptr / 0.08))
    img = apply_rgb_fx(img, shot.get('fx', []), tr, fi, (W, H), img)
    return img

def letterbox(t):
    if t < OPEN_T: return BAR
    return int(BAR * (1 - ease((t - OPEN_T) / 0.7, 'out')))

def cue_at(t):
    for c in CUES:
        if c['t0'] <= t < c['t1'] + 0.15: return c
    return None

def frame(shot, fi, clips):
    t = fi / FPS; tr = t - shot['t0']; dur = shot['t1'] - shot['t0']
    if shot.get('kind') == 'panels':
        img = render_panel_frame(shot, tr, fi, clips)
    elif shot.get('kind') == 'title':
        img = render_title(shot, tr, fi)
    else:
        clip = clips[0]
        n_src = len(clip.frames)
        spd = shot.get('speed') or min(1.0, (n_src / clip.fps - 0.05) / dur)
        q = 2 if shot.get('twos', True) and spd > 0.55 else 1
        idx = int(tr * spd * clip.fps / q) * q
        if shot.get('reverse'): idx = n_src - 1 - idx
        cs = cam_state(shot.get('cam'), tr, dur)
        fxs = shot.get('fx', [])
        need = any(f['k'] in ('silhouette', 'lightning', 'flatwhite') or (f['k'] == 'radial' and f.get('focus')) for f in fxs)
        vt = shot.get('cam', {}).get('vertigo')
        ink, src_img, mk = render_view(clip, idx, cs, (W, H), shot.get('tone'), need, vt, tr / dur)
        ink = apply_ink_fx(ink, fxs, tr, fi, mk, (W, H))
        img = paper_of(ink, shot.get('tone'))
        img = apply_rgb_fx(img, fxs, tr, fi, (W, H), src_img)
        if 'whip' in shot and tr < 0.2:                # 甩镜入画
            p = tr / 0.2; off = (1 - ease(p, 'out')) * W * 0.6 * shot['whip']
            img = fx.h_blur(np.roll(img, int(off), axis=1), 120 * (1 - p))
        if shot.get('whip_out') and dur - tr < 0.2:
            p = 1 - (dur - tr) / 0.2; off = -ease(p, 'in') * W * 0.6 * shot['whip_out']
            img = fx.h_blur(np.roll(img, int(off), axis=1), 120 * p)
    # 遮幅 + 字幕
    b = letterbox(t)
    if b > 0:
        img[:b] = 0; img[H - b:] = 0
    c = cue_at(t)
    if c and not shot.get('nosub'):
        if b > 90: img = fx.subtitle(img, c['text'], c['who'], H - b / 2, 1.0, True, 44)
        else: img = fx.subtitle(img, c['text'], c['who'], H - 70, 1.0, False, 46)
    return img

def render_title(shot, tr, fi):
    dur = shot['t1'] - shot['t0']
    ink = np.ones((H, W), np.float32)
    ink = fx.radial_lines(ink, W / 2, H / 2, W * 0.33, H * 0.42, 220, fi // 2, 1.3)
    img = to_paper(ink)
    img = fx.light_burst(img, W / 2, H / 2, max(0.0, 1 - tr / 1.0) * 0.9, seed=fi // 3)
    for f in shot.get('fx', []):
        pass
    img = apply_rgb_fx(img, shot.get('fx', []), tr, fi, (W, H), img)
    return img

# ---------------- 镜头编码 ----------------
def load_clips(shot):
    if shot.get('kind') == 'panels':
        return [Clip(*p['src']) for p in shot['panels']]
    if shot.get('kind') == 'title': return []
    return [Clip(*shot['src'])]

def render_shot(args):
    k, shot, outdir = args
    f0, f1 = int(round(shot['t0'] * FPS)), int(round(shot['t1'] * FPS))
    path = os.path.join(outdir, f'{k:03d}.mp4')
    clips = load_clips(shot)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-tune', 'grain', path], stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        p.stdin.write(frame(shot, fi, clips).tobytes())
    p.stdin.close(); p.wait()
    return k, f1 - f0

def still(shot, t, path, clips=None):
    clips = clips or load_clips(shot)
    cv2.imwrite(path, frame(shot, int(round(t * FPS)), clips), [cv2.IMWRITE_JPEG_QUALITY, 90])

if __name__ == '__main__':
    from shots import SHOTS
    ap = argparse.ArgumentParser()
    ap.add_argument('--shots', default=''); ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--still', default=''); ap.add_argument('--out', default=os.path.join(ROOT, 'out/segs'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    if a.still:   # --still 12.3,40.1 → out/stills/
        sd = os.path.join(ROOT, 'out/stills'); os.makedirs(sd, exist_ok=True)
        for ts in a.still.split(','):
            t = float(ts); k = next(i for i, s in enumerate(SHOTS) if s['t0'] <= t < s['t1'])
            still(SHOTS[k], t, os.path.join(sd, f'{t:07.2f}.jpg')); print('still', t, 'shot', k)
        sys.exit()
    ids = [int(x) for x in a.shots.split(',')] if a.shots else list(range(len(SHOTS)))
    ids.sort(key=lambda i: -(SHOTS[i]['t1'] - SHOTS[i]['t0']))     # 长镜头先排，负载均衡
    with Pool(a.jobs) as pool:
        for k, n in pool.imap_unordered(render_shot, [(i, SHOTS[i], a.out) for i in ids]):
            print(f'shot {k:03d} {n} frames', flush=True)
