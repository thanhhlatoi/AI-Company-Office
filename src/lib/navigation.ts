import type { NavigateFunction } from 'react-router-dom'

// Cho code ngoài React (toast từ sự kiện realtime) điều hướng được. App đăng ký ở gốc.
let nav: NavigateFunction | null = null
export const setNavigator = (fn: NavigateFunction) => { nav = fn }
export const navigateTo = (to: string) => nav?.(to)
