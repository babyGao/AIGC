# 13 · 坚持（逆流河 · 坚持仙蛊炼成）

现阶段：**收集素材，等用户确认。** 第一版四块风格板里的人物和场景是凭空建模的，已被否定；按原文和已有同人图收齐素材（`docs/素材库.md`，线上页面 https://claude.ai/artifact/NhMCrYa4UB8w1XKshnLvhK ）之后，再重做风格板。成片尚未渲染。

| 文件 | 内容 |
|---|---|
| `docs/素材库.md` | 场景与人物素材：原文描写、同人视频截图与插画、真实紫貂、航海王手法拆解、诺兰要点，每张图标出处与是否符合原文 |
| `refs/sources.json` | 素材图清单（出处、视频时间点、原图地址）；第三方图片不进仓库 |
| `refs/onepiece/` | 从用户给的航海王页裁出的九种打斗手法 |
| `boards/风格板_woodcut.jpg` | （第一版，已否定）木刻版画 × 航海王 × 诺兰 |
| `boards/风格板_puppet.jpg` | （第一版，已否定）皮影戏 × 航海王 × 诺兰 |
| `boards/风格板_ink.jpg` | （第一版，已否定）中国水墨 × 航海王 × 诺兰 |
| `boards/风格板_spy.jpg` | （第一版，已否定）60s 间谍片头 × 航海王 × 诺兰 |
| `boards/四风格对比.jpg` | 同一组镜头（K2/K6/K7/K10）四种风格并排 |
| `boards/frames/<风格>/` | 每块板的单帧（1280×720） |
| `TREATMENT.md` | 导演阐述：结构、诺兰化与航海王化、四种风格的改造、关键镜头表、全片分场 |
| `docs/字幕校对.md` | 音频转写与按原文纠错的记录 |
| `docs/角色与场景.md` | 宏观 / 中观 / 微观场景，人物站位与外貌设定 |
| `data/cues.json` · `data/字幕草稿.srt` | 68 条字幕时间轴（音频为准） |
| `film/` | 绘制源码：`shared/`（角色几何、时间轴）+ 四种风格各一个文件夹 |

重出风格板（需要 `~/lemo-opuscar` 库，已装 npm 依赖与 `.venv`）：

```sh
sh tools/render_boards.sh              # 全部四种
STYLES=spy sh tools/render_boards.sh   # 只重出一种
```

单帧预览：`cd ~/lemo-opuscar && node core/render/still.mjs <本目录>/film 121 --q style=woodcut`（`style=woodcut|puppet|ink|spy`，`sheet=1` 出造型板，`nosub=1` 去字幕）。
