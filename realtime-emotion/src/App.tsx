import { Camera, CameraOff } from "lucide-react"
import { useFaceEmotion } from "@/hooks/useFaceEmotion"
import { useEmotionWarning } from "@/hooks/useEmotionWarning"
import { DEFAULT_WARNING_CONFIG, WARNING_META } from "@/lib/warning"
import { CameraView } from "@/components/CameraView"
import { EmotionPanel } from "@/components/EmotionPanel"
import { WarningBanner } from "@/components/WarningBanner"

export default function App() {
  const { videoRef, canvasRef, status, error, scores, hasFace, fps, start, stop } =
    useFaceEmotion()

  const running = status === "running"
  const loading = status === "loading"

  // 三级预警：消费表情分数，不改变原有识别逻辑
  const { warning, warningLog, notifying, blocked, dismiss } = useEmotionWarning(
    scores,
    running,
    DEFAULT_WARNING_CONFIG,
    {
      // 三级：紧急干预 / 阻断 —— 停止摄像头采集
      onLevel3: () => stop(),
    },
  )

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-200">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            实时面部情绪识别
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            基于浏览器摄像头与 face-api.js 本地模型，实时检测面部关键点并分类情绪
          </p>
        </header>

        {/* 三级负面情绪预警（一级轻提示 / 二级通知 / 三级阻断） */}
        <WarningBanner state={{ warning, warningLog, notifying, blocked, dismiss }} onDismiss={dismiss} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <CameraView
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={status}
              hasFace={hasFace}
              fps={fps}
            />

            <div className="flex items-center justify-center gap-3">
              {!running ? (
                <button
                  onClick={start}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  {loading ? "启动中…" : "开启摄像头"}
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-rose-500"
                >
                  <CameraOff className="h-4 w-4" />
                  停止
                </button>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">
                出错：{error}
                <br />
                请确认已授予摄像头权限，并在 localhost 或 HTTPS 环境下访问。
              </p>
            )}
          </div>

          <EmotionPanel scores={scores} hasFace={hasFace} active={running} />
        </div>

        <footer className="text-center text-xs text-slate-400">
          所有计算均在本地浏览器完成，视频画面不会上传到任何服务器。
        </footer>

        {/* 后台预警日志（一级即记录，满足可追溯要求） */}
        {warningLog.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-2 text-sm font-medium text-slate-500">预警日志（后台记录）</h2>
            <ul className="max-h-40 space-y-1 overflow-auto text-xs text-slate-600">
              {warningLog.map((e, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background:
                        e.level === "level1"
                          ? WARNING_META.level1.color
                          : e.level === "level2"
                            ? WARNING_META.level2.color
                            : WARNING_META.level3.color,
                    }}
                  />
                  <span className="tabular-nums text-slate-400">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium">{e.label}</span>
                  <span>{(e.confidence * 100).toFixed(0)}%</span>
                  <span className="text-slate-400">· {e.note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
