# 13 · 宿敌 —— 许嵩《天龙八部之宿敌》水墨 MV

用 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的「中国水墨 Chinese Ink Wash」风格，为许嵩《天龙八部之宿敌》做的一支古风 MV（263 秒，1920×1080，24 fps）。全部画面由代码逐帧绘制，卡拉 OK 细体歌词逐字着墨，Claude 的小宠物 Clawd 是整幅水墨里唯一的颜色。

| 文件 | 内容 |
|---|---|
| `sudi-shuimo/sudi.mp4` | 成片（原创古风配乐版） |
| `sudi-shuimo/sudi.srt` | 歌词字幕（52 句） |
| `sudi-shuimo/poster.jpg` | 海报帧 |
| `sudi-shuimo/TREATMENT.md` | 创作方案：歌曲读解、三个候选结构、分镜表、节拍表、声音设计、字幕设计 |
| `sudi-shuimo/CREDITS` | 第三方素材与授权 |
| `docs/MV制作技巧调研.md` | MV 制作技巧与导演要点调研（含来源） |
| `docs/创作说明.md` | 这支片子怎么拍的：主题、母题、三遍副歌、转场、Clawd、音乐与字幕 |

## 关于音乐（重要）

原曲录音有版权，不能放进仓库。所以 `sudi.mp4` 用的是**原创古风器乐配乐**：完全按原曲的段落、速度（96.9 BPM）和**每一个字的时间**写成，二胡代替人声，一个字一个音（旋律是新写的），所以卡拉 OK 走字和音乐严丝合缝。

你手上有正版原曲音频时，一条命令换成原曲版（不重渲画面，只重新混音封装，几十秒）：

```sh
sh sudi-shuimo/with_song.sh /path/to/天龙八部之宿敌.mp3      # 可加第二个参数微调偏移（秒）
```

字幕本来就是按原曲（263 秒版本）的逐字时间做的，换上原曲就是标准的卡拉 OK MV。

## 从源码重建

需要 Node 20+、ffmpeg、Python 3.11+，以及 Lemo-Opuscar 库（放在 `~/lemo-opuscar`，按其 README 安装依赖，并 `sh tools/fetch.sh instruments karoryfer|vcsl|vsco2ce`）。

```sh
sh sudi-shuimo/build.sh      # 歌词时间轴 → 配乐 → 事件 → 混音 → 逐帧渲染 → 叠歌词层 → −14 LUFS 封装
```

没有 GPU 的机器上逐帧渲染约 45 分钟（WebGL 走软件渲染）。
