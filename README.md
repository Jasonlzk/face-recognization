# 实时面部情绪识别（浏览器端）

通过浏览器摄像头实时捕捉用户面部，使用 **face-api.js** 在本地进行人脸检测、68 个面部关键点提取与 7 类基本情绪识别，并将结果以概率条实时可视化。

> 所有计算均在浏览器本地完成，视频画面不会上传到任何服务器，隐私安全、低延迟。

## 功能特性

- 🎥 **实时摄像头捕捉**：基于 `getUserMedia` API 获取视频流并实时显示（移动端自动使用前置摄像头）。
- 🔍 **面部关键点检测**：加载 `tinyFaceDetector` + `faceLandmark68Net`，在画面上叠加绘制 68 个面部关键点。
- 😊 **7 类情绪分类**：开心 / 悲伤 / 愤怒 / 惊讶 / 恐惧 / 厌恶 / 中性，基于 `faceExpressionNet` 实时输出各类概率。
- 📊 **可视化展示**：主导情绪大图标 + 7 条实时概率条，界面右上角显示实时 FPS。
- ⚡ **流畅体验**：检测循环与渲染解耦，并对 UI 更新限流，保证高帧率与顺滑交互。
- 📱 **响应式设计**：桌面与移动端浏览器自适应布局（窄屏单列、宽屏双列）。

## 技术栈

- Vite + React 18 + TypeScript
- Tailwind CSS v4
- face-api.js（TensorFlow.js 驱动的人脸识别模型，模型权重已内置在 `public/models`）

## 快速开始

```bash
cd realtime-emotion
npm install
npm run dev
```

打开终端提示的地址（默认 http://localhost:5174 ），点击「开启摄像头」并授权摄像头权限即可。

> ⚠️ 浏览器要求 `getUserMedia` 必须在**安全上下文**下运行：
> - `localhost` 可直接使用；
> - 通过局域网 IP（如手机访问电脑）必须使用 **HTTPS**，否则摄像头无法开启。

## 生产构建

```bash
npm run build      # 类型检查 + 打包到 dist/
npm run preview    # 本地预览构建产物
```

## 目录结构

```
realtime-emotion/
├── public/models/             # face-api.js 模型权重（已内置，离线可用）
├── src/
│   ├── lib/emotions.ts        # 情绪配置（中文标签/配色/图标）与工具函数
│   ├── hooks/useFaceEmotion.ts# 摄像头取流 + 模型加载 + 检测循环 + 关键点绘制
│   ├── components/
│   │   ├── CameraView.tsx     # 视频 + 关键点 canvas 叠加 + 状态遮罩
│   │   ├── EmotionPanel.tsx   # 主导情绪 + 7 条概率条
│   │   └── EmotionBar.tsx     # 单条概率条
│   ├── App.tsx                # 响应式布局与交互
│   └── main.tsx
└── ...
```

## 备注

- 默认检测器为 `tinyFaceDetector`（inputSize 224），在精度与速度间取得平衡；如需更高精度可改用 `ssdMobilenetv1`。
- 模型权重来自 [justadudewhohacks/face-api.js](https://github.com/justadudewhohacks/face-api.js)，已下载至 `public/models`，无需联网即可运行。
