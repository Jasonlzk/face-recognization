import { useCallback, useEffect, useRef, useState } from "react"
import * as faceapi from "face-api.js"
import { EMOTION_KEYS, emptyScores, type ExpressionScores } from "@/lib/emotions"

const MODEL_URL = "/models"

export type Status = "idle" | "loading" | "running" | "error"

export interface FaceEmotionState {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  status: Status
  error: string | null
  scores: ExpressionScores
  hasFace: boolean
  fps: number
  start: () => Promise<void>
  stop: () => void
}

export function useFaceEmotion(): FaceEmotionState {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const runningRef = useRef(false)
  const modelsLoadedRef = useRef(false)
  const lastFrameTimeRef = useRef(0)
  const lastUiUpdateRef = useRef(0)

  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState<ExpressionScores>(emptyScores())
  const [hasFace, setHasFace] = useState(false)
  const [fps, setFps] = useState(0)

  const loadModels = useCallback(async () => {
    if (modelsLoadedRef.current) return
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    modelsLoadedRef.current = true
  }, [])

  const stop = useCallback(() => {
    runningRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStatus("idle")
    setHasFace(false)
    setScores(emptyScores())
    setFps(0)
    const canvas = canvasRef.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const loop = useCallback(async () => {
    if (!runningRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
      })
      try {
        const detection = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks()
          .withFaceExpressions()

        const now = performance.now()
        if (lastFrameTimeRef.current > 0) {
          const instFps = 1000 / (now - lastFrameTimeRef.current)
          // 平滑 FPS
          setFps((prev) => Math.round(prev * 0.8 + instFps * 0.2))
        }
        lastFrameTimeRef.current = now

        if (detection) {
          setHasFace(true)
          const exp = detection.expressions as unknown as Record<string, number>
          const next = emptyScores()
          for (const k of EMOTION_KEYS) next[k] = exp[k] ?? 0

          // 在 canvas 上叠加绘制 68 个面部关键点
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          ctx?.clearRect(0, 0, canvas.width, canvas.height)
          faceapi.draw.drawFaceLandmarks(canvas, detection)

          // 限流 UI 更新（约 12fps 刷新界面），检测本身仍在全速进行
          if (now - lastUiUpdateRef.current > 80) {
            lastUiUpdateRef.current = now
            setScores(next)
          }
        } else {
          setHasFace(false)
          const ctx = canvas.getContext("2d")
          ctx?.clearRect(0, 0, canvas.width, canvas.height)
        }
      } catch {
        // 单帧推理异常时跳过，继续下一帧，保证实时性
      }
    }
    if (runningRef.current) requestAnimationFrame(() => void loop())
  }, [])

  const start = useCallback(async () => {
    try {
      setError(null)
      setStatus("loading")
      await loadModels()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error("视频元素未就绪")
      video.srcObject = stream
      await video.play()

      runningRef.current = true
      lastFrameTimeRef.current = 0
      setStatus("running")
      loop()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "无法启动摄像头"
      setError(msg)
      setStatus("error")
    }
  }, [loadModels, loop])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { videoRef, canvasRef, status, error, scores, hasFace, fps, start, stop }
}
