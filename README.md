# 🐑 东东羊拍拍灯 · DongDong Pat Lamp

一个用 Three.js 做的 3D 拍拍灯小玩具：**拍拍小羊 → 开灯 / 关灯**。

原型取自《蛋仔派对》× Flying DongDong 联动的云彩小羊：雪白植绒羊毛、豆豆眼、红圆框眼镜、两朵腮红、头顶羊毛蜷成一团，还带着画家的调色板和画笔。

## 玩法

| 操作 | 效果 |
| ---- | ---- |
| 👆 轻拍小羊 | 开灯 / 关灯（果冻形变 + 眯眼咧嘴 + 小手欢呼） |
| 🖱️ 拖动 | 旋转视角（松手带惯性，8 秒不动自动环绕） |
| 🖲️ 滚轮 | 拉近拉远 |
| ⌨️ 空格 / 回车 | 开关灯 |

## 特点

- 全程序化建模：羊毛用 290 个 InstancedMesh 小球铺成，豆豆眼会眨眼
- 开灯：体内暖光 + 光晕呼吸 + 漂浮光尘 + 暖光洒在圆台上，身边云朵透出暖光
- 音效由 WebAudio 现场合成，无任何音频/贴图文件
- 手机触屏可用

## 运行

直接双击 `index.html` 即可（three.min.js 已放本地，无需联网）。

## 部署到 GitHub Pages

```bash
git init
git add .
git commit -m "东东羊拍拍灯"
gh repo create egg-pat-lamp --public --source=. --push   # 需已登录 gh
gh api repos/{你的用户名}/egg-pat-lamp/pages -X POST -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/"
```

访问：`https://{你的用户名}.github.io/egg-pat-lamp/`

## 文件

- `index.html` — 页面与样式
- `app.js` — 3D 场景与交互
- `three.min.js` — Three.js r147（本地副本，607KB）
