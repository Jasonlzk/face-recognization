# 实时面部情绪识别（浏览器端）

通过浏览器摄像头实时捕捉用户面部，使用 **face-api.js** 在本地进行人脸检测、68 个面部关键点提取与 7 类基本情绪识别，并将结果以概率条实时可视化。

> 所有计算均在浏览器本地完成，视频画面不会上传到任何服务器，隐私安全、低延迟。

## 功能特性

- 🎥 **实时摄像头捕捉**：基于 `getUserMedia` API 获取视频流并实时显示（移动端自动使用前置摄像头）。
- 🔍 **面部关键点检测**：加载 `tinyFaceDetector` + `faceLandmark68Net`，在画面上叠加绘制 68 个面部关键点。
- 😊 **7 类情绪分类**：开心 / 悲伤 / 愤怒 / 惊讶 / 恐惧 / 厌恶 / 中性，基于 `faceExpressionNet` 实时输出各类概率。
- 🚨 **负面情绪三级预警（v1.1.0）**：针对愤怒、沮丧等负面情绪构建三级预警 —— 一级后台记录、二级通知相关方、三级紧急干预/阻断，阈值可配置。
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
│   ├── lib/warning.ts         # 三级预警配置接口 + 阈值逻辑（新增 v1.1.0）
│   ├── hooks/useFaceEmotion.ts# 摄像头取流 + 模型加载 + 检测循环 + 关键点绘制
│   ├── hooks/useEmotionWarning.ts # 消费表情分数 → 三级预警状态机（新增）
│   ├── components/
│   │   ├── CameraView.tsx     # 视频 + 关键点 canvas 叠加 + 状态遮罩
│   │   ├── EmotionPanel.tsx   # 主导情绪 + 7 条概率条
│   │   ├── EmotionBar.tsx     # 单条概率条
│   │   └── WarningBanner.tsx  # 三级预警 UI（轻提示/通知/阻断浮层，新增）
│   ├── App.tsx                # 响应式布局与交互（含预警集成）
│   └── main.tsx
└── ...
```

## 负面情绪三级预警（v1.1.0）

在原有 7 类情绪识别之上，新增针对**愤怒、沮丧、恐惧、厌恶**等负面情绪的自动预警，
对现有识别逻辑**零侵入**（仅消费表情概率，不改变 face-api 结果）。

### 三级定义

| 等级 | 触发条件 | 动作 |
|------|----------|------|
| 一级（关注） | 任一负面情绪置信度 ≥ `level1Threshold`（默认 0.25） | **仅后台记录** + 顶部轻提示条 |
| 二级（警告） | 主导负面情绪 ≥ `level2Threshold`（0.45）或加权负向强度 ≥ `level2Weight`（0.55） | **通知相关方**（浏览器通知 + 浮窗），并后台记录 |
| 三级（预警） | 主导负面 ≥ `level3Threshold`（0.65）或加权负向 ≥ `level3Weight`（0.85），且持续 `sustainFrames`（8）帧 | **紧急干预/阻断**：暂停摄像头采集 + 全屏干预浮层 |

> 三级需「持续若干帧」才触发，避免单帧抖动误阻断；`sad`（悲伤）在面部代理下作为「沮丧」信号。

### 预警配置接口（可调阈值）

所有阈值集中在 `src/lib/warning.ts` 的 `WarningConfig`，默认见 `DEFAULT_WARNING_CONFIG`：

```ts
export const DEFAULT_WARNING_CONFIG: WarningConfig = {
  level1Threshold: 0.25,
  level2Threshold: 0.45,
  level3Threshold: 0.65,
  level2Weight: 0.55,
  level3Weight: 0.85,
  sustainFrames: 8,
  negatives: [
    { key: "angry",   label: "愤怒", triggerConf: 0.30, weight: 1.6 },
    { key: "sad",     label: "沮丧", triggerConf: 0.30, weight: 1.3 },
    { key: "fearful", label: "恐惧", triggerConf: 0.35, weight: 1.2 },
    { key: "disgusted", label: "厌恶", triggerConf: 0.35, weight: 1.1 },
  ],
}
```

在 `App.tsx` 中按需覆盖（例如更灵敏的愤怒预警）：

```tsx
import { DEFAULT_WARNING_CONFIG, type WarningConfig } from "@/lib/warning"

const myConfig: WarningConfig = {
  ...DEFAULT_WARNING_CONFIG,
  level2Threshold: 0.4, // 更早通知
  negatives: [
    ...DEFAULT_WARNING_CONFIG.negatives,
  ],
}

useEmotionWarning(scores, running, myConfig, {
  onLevel2: (p) => console.log("通知相关方", p), // 自定义通知渠道（短信/工单/IM）
  onLevel3: (p) => { stop(); /* 自定义阻断，如锁定会话 */ },
})
```

## 备注

- 默认检测器为 `tinyFaceDetector`（inputSize 224），在精度与速度间取得平衡；如需更高精度可改用 `ssdMobilenetv1`。
- 模型权重来自 [justadudewhohacks/face-api.js](https://github.com/justadudewhohacks/face-api.js)，已下载至 `public/models`，无需联网即可运行。

## 部署到 CloudBase 静态托管

本项目已部署到腾讯云开发（CloudBase）静态网站托管，可直接在浏览器打开使用：

- **线上地址**：https://super-coding-7g3ppgel159a8f2f-1410509749.tcloudbaseapp.com/
- 环境：`super-coding-7g3ppgel159a8f2f`（ap-shanghai，体验版）
- 模型权重随 `dist/` 一并托管在 `/models`，离线可用。

部署流程：

```bash
npm run build                      # 类型检查 + 打包到 dist/
# 将 dist/ 上传至 CloudBase 静态托管根目录，并配置 index.html 为首页
```
