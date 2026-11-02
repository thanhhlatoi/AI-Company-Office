import { Footprints, LocateFixed } from 'lucide-react'
import { useMotionStore, type MoveInfo } from '../../store/motionStore'

const TEXT: Record<MoveInfo['state'], (dest: string | null) => string> = {
  STANDING_UP: () => 'Đang đứng dậy',
  WALKING: (d) => (d ? `Đang đi tới ${d}` : 'Đang đi'),
  ARRIVED: (d) => (d ? `Đang ở ${d}` : 'Đã tới nơi'),
  RETURNING: () => 'Đang quay về chỗ ngồi',
  SITTING_DOWN: () => 'Đang ngồi xuống',
}

/** Hiện khi nhân vật đang rời chỗ: "Đang đi tới bàn Mua hàng" + nút Theo dõi (camera bám theo; kéo chuột hoặc bấm lại để thả). */
export function MovementCard({ agentId }: { agentId: string }) {
  const info = useMotionStore((s) => s.moving[agentId])
  const following = useMotionStore((s) => s.followId === agentId)
  const setFollow = useMotionStore((s) => s.setFollow)
  if (!info) return null
  return (
    <div className="flex items-center justify-between gap-2 rounded-card border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Footprints size={16} className="shrink-0 text-sky-600" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate">{TEXT[info.state](info.dest)}</span>
          {info.simulated && <span className="block text-xs text-slate-600">Mô phỏng — không phải việc thật</span>}
        </span>
      </span>
      <button
        onClick={() => setFollow(following ? null : agentId)}
        aria-pressed={following}
        aria-label={following ? 'Thôi theo dõi' : 'Theo dõi'}
        className={`flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1 ${following ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-300 bg-white text-sky-700 hover:bg-sky-100'}`}
      >
        <LocateFixed size={14} /> {following ? 'Đang theo dõi' : 'Theo dõi'}
      </button>
    </div>
  )
}
