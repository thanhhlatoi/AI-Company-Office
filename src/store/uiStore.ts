import { create } from 'zustand'

import { useToastStore } from './toastStore'

export type ToastKind = 'success' | 'error'

export type StatusFilter = 'all' | 'WORKING' | 'ERROR'

interface UiState {
  form: { open: boolean; editId: string | null; departmentId: string | null }
  /** Hộp thư phê duyệt (ngăn phải). `focusId` = yêu cầu cần cuộn tới và tô nổi. */
  inbox: { open: boolean; focusId: string | null }
  /** Ngăn "Thông báo" (chuông thông tin) */
  notifPanel: boolean
  openNotifs: () => void
  closeNotifs: () => void
  /** Hộp "Phím tắt" (phím ?) */
  shortcutsOpen: boolean
  setShortcuts: (open: boolean) => void
  openInbox: (focusId?: string) => void
  /** Hộp thoại "Mục tiêu mới"; departmentId = phòng chọn sẵn */
  composer: { open: boolean; departmentId: string | null }
  openComposer: (departmentId?: string) => void
  closeComposer: () => void
  closeInbox: () => void
  /** Phòng đang được camera tập trung (null = toàn công ty). Nguồn thật là URL; AppLayout đồng bộ vào đây. */
  focusDepartmentId: string | null
  lastDepartmentSlug: string | null
  sidebarCollapsed: boolean
  setFocusDepartment: (id: string | null) => void
  rememberDepartment: (slug: string) => void
  toggleSidebar: () => void
  /** Panel phòng ban (khác panel agent); chỉ hiện khi đang xem một phòng và không chọn agent. */
  deptPanelOpen: boolean
  paletteOpen: boolean
  statusFilter: StatusFilter
  setDeptPanel: (open: boolean) => void
  setPalette: (open: boolean) => void
  setStatusFilter: (f: StatusFilter) => void
  openForm: (editId?: string, departmentId?: string) => void
  closeForm: () => void
  /** Phản hồi thao tác ("Đã duyệt"). success -> SUCCESS (5s); error -> WARNING (10s). Toast từ sự kiện hệ thống: xem realtime/dispatch.ts */
  toast: (text: string, kind?: ToastKind) => void
}

export const useUiStore = create<UiState>((set) => ({
  form: { open: false, editId: null, departmentId: null },
  inbox: { open: false, focusId: null },
  composer: { open: false, departmentId: null },
  openComposer: (departmentId) => set({ composer: { open: true, departmentId: departmentId ?? null } }),
  closeComposer: () => set({ composer: { open: false, departmentId: null } }),
  notifPanel: false,
  shortcutsOpen: false,
  setShortcuts: (shortcutsOpen) => set({ shortcutsOpen }),
  openNotifs: () => set({ notifPanel: true, inbox: { open: false, focusId: null } }), // chỉ một ngăn phải: mở cái này đóng cái kia
  closeNotifs: () => set({ notifPanel: false }),
  openInbox: (focusId) => set({ notifPanel: false, inbox: { open: true, focusId: focusId ?? null } }),
  closeInbox: () => set({ inbox: { open: false, focusId: null } }),
  deptPanelOpen: false,
  paletteOpen: false,
  statusFilter: 'all',
  setDeptPanel: (deptPanelOpen) => set({ deptPanelOpen }),
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  focusDepartmentId: null,
  lastDepartmentSlug: null,
  sidebarCollapsed: false,
  setFocusDepartment: (focusDepartmentId) => set({ focusDepartmentId }),
  rememberDepartment: (lastDepartmentSlug) => set({ lastDepartmentSlug }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openForm: (editId, departmentId) => set({ form: { open: true, editId: editId ?? null, departmentId: departmentId ?? null } }),
  closeForm: () => set({ form: { open: false, editId: null, departmentId: null } }),
  toast: (text, kind = 'success') => useToastStore.getState().push({ level: kind === 'error' ? 'WARNING' : 'SUCCESS', title: text, key: `ui:${kind}:${text}` }),
}))
