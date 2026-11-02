import { TILE } from './config.ts'

/**
 * Module DUY NHẤT biết cách đổi toạ độ lưới <-> màn hình (thế giới). 3/4 top-down:
 * lưới vuông, không xoay; chiều sâu = y càng lớn càng gần camera.
 */
export interface Pt { x: number; y: number }

export const gridToScreen = (gx: number, gy: number): Pt => ({ x: gx * TILE, y: gy * TILE })
export const screenToGrid = (x: number, y: number): Pt => ({ x: x / TILE, y: y / TILE })
/** Ô chứa điểm thế giới (làm tròn xuống). */
export const cellAt = (x: number, y: number): Pt => ({ x: Math.floor(x / TILE), y: Math.floor(y / TILE) })

/** Khoá sắp độ sâu = y của đáy footprint (px thế giới) + chỉnh nhỏ theo loại (vd thảm < đồ vật < người). */
export const depthKey = (footprint: { gy: number; h: number }, bias = 0): number => (footprint.gy + footprint.h) * TILE + bias
