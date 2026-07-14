export type EmotionKey =
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "fearful"
  | "disgusted"
  | "neutral"

export interface EmotionMeta {
  key: EmotionKey
  /** 中文标签 */
  label: string
  /** 展示用 emoji 图标 */
  emoji: string
  /** 概率条颜色 */
  color: string
}

/** 7 种基本情绪（与 face-api.js 的 expression 输出一一对应） */
export const EMOTIONS: EmotionMeta[] = [
  { key: "happy", label: "开心", emoji: "😊", color: "#22c55e" },
  { key: "sad", label: "悲伤", emoji: "😢", color: "#3b82f6" },
  { key: "angry", label: "愤怒", emoji: "😠", color: "#ef4444" },
  { key: "surprised", label: "惊讶", emoji: "😲", color: "#eab308" },
  { key: "fearful", label: "恐惧", emoji: "😨", color: "#a855f7" },
  { key: "disgusted", label: "厌恶", emoji: "🤢", color: "#84cc16" },
  { key: "neutral", label: "中性", emoji: "😐", color: "#64748b" },
]

export const EMOTION_KEYS = EMOTIONS.map((e) => e.key)

export type ExpressionScores = Record<EmotionKey, number>

export function emptyScores(): ExpressionScores {
  return EMOTION_KEYS.reduce((acc, k) => {
    acc[k] = 0
    return acc
  }, {} as ExpressionScores)
}

/** 取分值最高的情绪作为主导情绪 */
export function dominant(scores: ExpressionScores): EmotionMeta {
  let best = EMOTIONS[0]
  for (const e of EMOTIONS) {
    if (scores[e.key] > scores[best.key]) best = e
  }
  return best
}
