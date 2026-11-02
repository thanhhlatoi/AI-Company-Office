import { create } from 'zustand'

/** Trạng thái di chuyển của một nhân vật để panel hiển thị ("Đang đi tới ..."). Chỉ cập nhật khi đổi, không mỗi frame. */
export interface MoveInfo {
  state: 'STANDING_UP' | 'WALKING' | 'ARRIVED' | 'RETURNING' | 'SITTING_DOWN'
  /** tên đích ("bàn Mua hàng", "phòng họp"...) */
  dest: string | null
  /** hành trình mô phỏng (đi lại ngẫu nhiên), không phải việc thật */
  simulated: boolean
}

interface MotionState {
  moving: Record<string, MoveInfo>
  /** agent mà camera đang bám theo (null = không bám) */
  followId: string | null
  setMoving: (id: string, info: MoveInfo | null) => void
  setFollow: (id: string | null) => void
}

export const useMotionStore = create<MotionState>((set) => ({
  moving: {},
  followId: null,
  setMoving: (id, info) =>
    set((s) => {
      if (!info) {
        if (!(id in s.moving)) return s
        const { [id]: _gone, ...rest } = s.moving
        // người đã về chỗ thì không còn gì để bám theo
        return { moving: rest, followId: s.followId === id ? null : s.followId }
      }
      return { moving: { ...s.moving, [id]: info } }
    }),
  setFollow: (followId) => set({ followId }),
}))
