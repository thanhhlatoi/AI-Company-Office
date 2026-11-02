import type { Manifest } from './manifest.ts'

export interface CreditRow { id: string; name: string; author: string; sourceUrl: string; license: string; attributionRequired: boolean; notes: string; provides: string[] }

/** Danh sách ghi công tự sinh từ manifest: mỗi gói kèm các lớp nhân vật nó cung cấp. */
export const creditsOf = (m: Manifest): CreditRow[] =>
  m.packs.map((p) => ({ ...p, provides: m.characterLayers.filter((l) => l.pack === p.id).map((l) => l.id) }))
