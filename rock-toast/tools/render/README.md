# 动态视频渲染

先设置 `LIB` 为已安装依赖的 lemo-opuscar 目录，使用其中的 Python 环境。需要 FFmpeg、Playwright Chromium。

```powershell
$env:LIB = 'C:/Users/高泽林/lemo-opuscar'
& "$env:LIB/.venv/Scripts/python.exe" -I paint/prep_shot.py --flow
node tools/render/film.mjs --shot s09
```

预处理同时生成双向位移和物体轮廓数据。渲染器按物体对齐底色、笔触与高光，再处理遮挡；相同输入的完整镜头会复用已校验产物。

```powershell
node tools/tests/motion.mjs
node tools/render/film.mjs --page tools/tests/motion-scene.html --times 0 --out review/ghosting-fix/check.png
node tools/render/film.mjs --shot s09 --times 0.9 --out review/ghosting-fix/frame.png
& "$env:LIB/.venv/Scripts/python.exe" tools/analyze/ghosting_check.py
```

逐镜视频保存在 `paint/out/`，检查图片保存在 `review/ghosting-fix/`。修复前完整存档保存在 `out/archive/before-ghosting-20261017/`。

轮廓数据目前覆盖本片动态镜头的最多四个分区；增加分区时需同步扩展预处理和渲染端。
