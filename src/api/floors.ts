import { z } from 'zod'
import { FloorSchema, LayoutSchema } from '../types/floor'
import { request } from './http'

export const listFloors = () => request('GET', '/floors', z.array(FloorSchema))
/** Bố cục XUẤT BẢN của tầng. */
export const getFloorLayout = (slug: string, query = '') => request('GET', `/floors/${slug}/layout${query}`, LayoutSchema)
/** Tạo lại bố cục mặc định (BE đưa vào bản nháp; mock thay luôn bản hiện hành). */
export const regenerateLayout = (slug: string) => request('POST', `/floors/${slug}/layout/regenerate`, LayoutSchema)
