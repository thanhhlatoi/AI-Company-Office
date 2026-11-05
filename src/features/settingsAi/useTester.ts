import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/http'
import { testAi } from '../../api/settingsAi'
import type { TestBody, TestResult } from '../../types/settingsAi'
import { describeError } from './errors'

type TestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: TestResult }
  | { status: 'error'; message: string; requestId?: string; code?: string }

/**
 * Một lần thử tại một thời điểm: chạy lần mới thì huỷ lần cũ, kết quả cũ không đè kết quả mới.
 * Kết quả chỉ nằm trong state tạm của thẻ (không lưu bền); `body` (có thể chứa khoá ở bước sau) không được giữ lại.
 */
export function useTester() {
  const [state, setState] = useState<TestState>({ status: 'idle' })
  const ctl = useRef<AbortController | null>(null)
  const run = useCallback(async (body: TestBody) => {
    ctl.current?.abort()
    const c = new AbortController()
    ctl.current = c
    setState({ status: 'running' })
    try {
      const result = await testAi(body, c.signal)
      if (ctl.current === c) setState({ status: 'done', result })
    } catch (e) {
      if (c.signal.aborted || ctl.current !== c) return
      setState({ status: 'error', ...describeError(e), code: e instanceof ApiError ? e.code : undefined })
    }
  }, [])
  const cancel = useCallback(() => { ctl.current?.abort(); ctl.current = null; setState({ status: 'idle' }) }, [])
  useEffect(() => () => ctl.current?.abort(), [])
  return { state, run, cancel }
}
