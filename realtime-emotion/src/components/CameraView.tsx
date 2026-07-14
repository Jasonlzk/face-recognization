import { Loader2 } from "lucide-react"
import type { Status } from "@/hooks/useFaceEmotion"

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  status: Status
  hasFace: boolean
  fps: number
}

export function CameraView({ videoRef, canvasRef, status, hasFace, fps }: CameraViewProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner">
      {/* 媒体层（视频 + 关键点叠加），整体水平镜像以获得自然自拍效果 */}
      <div className="absolute inset-0" style={{ transform: "scaleX(-1)" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>

      {/* 状态遮罩 */}
      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/70 text-center text-slate-200">
          <div className="text-4xl">📷</div>
          <p className="text-sm">点击下方「开启摄像头」开始实时识别</p>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/70 text-slate-200">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">正在加载模型并启动摄像头…</p>
        </div>
      )}

      {status === "running" && !hasFace && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500/90 px-3 py-1 text-xs text-white shadow">
          未检测到人脸，请正对摄像头
        </div>
      )}

      {/* FPS 指示（仅运行时显示） */}
      {status === "running" && (
        <div className="absolute right-3 top-3 rounded-md bg-black/50 px-2 py-1 text-xs tabular-nums text-emerald-300">
          {fps} FPS
        </div>
      )}
    </div>
  )
}
