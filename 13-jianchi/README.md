# 13 · 坚持（逆流河 · 坚持仙蛊炼成）

现阶段：**航海王黑白漫画画风的成片第一版**（1920×1080，30 帧，216.29 秒，时间轴按用户音频）。之前的木刻 / 皮影 / 水墨 / 间谍片头 / 油画厚涂风格板和绘制代码都已删除（在 git 历史里）。

做法：人物形象 90% 取自已有同人视频（方源、雪胡老祖、毛里球、赵怜云、白凝冰、黑楼兰、群仙），逐帧重绘成《航海王》式黑白漫画（墨线 + 实黑 + 45° 网点）；剩下的 10% 是自己加的：运镜（诺兰式）、冲击帧、集中线、拟声字、音浪、黑色闪电、光爆、漫画分格。导演阐述见 `TREATMENT.md`。

| 路径 | 内容 |
|---|---|
| `assets/原文.txt` | 用户给的文案（不改） |
| `assets/audio/narration.m4s` | 用户给的配音成品（只用来对时间；正式配音用户自己做） |
| `assets/ref/onepiece_*.jpg` | 用户给的航海王画风参考页 |
| `assets/ref/fangyuan.webp` | 用户给的方源参考图 |
| `assets/fonts/` | 拟声字（马善政）、字幕（霞鹜文楷），均 OFL |
| `data/cues.json` · `data/字幕草稿.srt` | 68 条字幕时间轴（以音频为准） |
| `docs/素材库.md` · `refs/sources.json` | 检索到的素材图与出处 |
| `refs/fangyuan_black/` | 用户指定的黑衣方源：`03_xiaojiu_crop.jpg`（换脸身份）、`02_user_manga.jpg`（官方漫画头像，造型参考）；`01_` 是之前检索的封面，已不用 |
| `refs/` | 检索到的素材图（第三方，不进仓库；`refs/onepiece/` 除外） |
| `sucai/videos/` | 扒下来的五部同人视频（不进仓库） |
| `sucai/keyframes/` | 从视频里截的关键帧（不进仓库） |
| `sucai/refs_hi/` | 素材图高清版（不进仓库） |
| `sucai/shots/` | 视频镜头切分索引页（`tools/shot_index.py` 生成，不进仓库） |
| `sucai/models/` | 抠像 u2net_human_seg / isnetis、换脸 inswapper_128 + buffalo_l、修复 GFPGAN 1.4（不进仓库） |
| `film/shots.py` | **分镜表**：每个镜头的素材入出点、运镜、特效、拟声字 |
| `film/render.py` | 逐帧渲染器（运镜、分格、遮幅、字幕） |
| `film/manga.py` | 漫画化滤镜（XDoG 墨线 + 实黑 + 网点 + 专色） |
| `film/fx.py` | 集中线、速度线、音浪、黑色闪电、光爆、粒子、拟声字 |
| `film/seg.py` | 人物抠像（冲击帧、希区柯克变焦、压黑袍用） |
| `film/face.py` | 方源换成黑衣版的脸（inswapper + GFPGAN），白衣压黑袍 |
| `out/` | 渲染产物（不进仓库） |

## 出片

```sh
python3 film/render.py --jobs 4        # 逐镜头渲染到 out/segs/
sh film/assemble.sh                    # → out/坚持.mp4（带原音轨）、out/坚持_无声.mp4
python3 film/render.py --still 12.0,90.5   # 单帧样张 → out/stills/
python3 film/render.py --shots 4,5         # 只重渲某几个镜头（编号见 shots.py 顺序）
sh tools/stills_all.sh                 # 每个镜头一张样张，拼成 out/review_*.jpg
```

依赖：Python 3（opencv-python-headless、numpy、Pillow、onnxruntime、insightface）、ffmpeg。
