import { useMemo, useState } from 'react'
import type { SettingsAi } from '../../types/settingsAi'
import { changedKeys, draftFrom, validateDraft, type Draft, type Key } from './draft'

/** Nháp = giá trị gốc từ server + các chỉnh sửa. Server refetch thì gốc đổi theo, chỉnh sửa của người dùng giữ nguyên. */
export function useDraft(s: SettingsAi) {
  const base = useMemo(() => draftFrom(s), [s])
  const [edits, setEdits] = useState<Partial<Draft>>({})
  const draft = useMemo(() => ({ ...base, ...edits }), [base, edits])
  return {
    base,
    draft,
    keys: changedKeys(base, edits),
    errors: validateDraft(draft),
    set: <K extends Key>(k: K, v: Draft[K]) => setEdits((e) => ({ ...e, [k]: v })),
    reset: () => setEdits({}),
    /** source = env: toàn bộ trường bị khoá */
    readOnly: s.source === 'env',
  }
}
export type DraftForm = ReturnType<typeof useDraft>
