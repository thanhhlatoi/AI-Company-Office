import { useState, type FormEvent } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useWorkStore } from '../../store/workStore'
import { useAssignTask } from './hooks'

const box = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none'

export function AssignTab({ agentId, onDone }: { agentId: string; onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const assign = useAssignTask(agentId)
  const toast = useUiStore((s) => s.toast)
  const paused = useWorkStore((s) => s.system.state === 'PAUSED')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (paused) return
    if (!title.trim()) return setError('Tiêu đề là bắt buộc')
    setError('')
    assign.mutate(
      { title: title.trim(), input },
      {
        onSuccess: () => { toast('Đã giao việc'); setTitle(''); setInput(''); onDone() },
        onError: () => toast('Giao việc thất bại', 'error'),
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Tiêu đề</span>
        <input className={box} value={title} onChange={(e) => setTitle(e.target.value)} />
        {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nội dung</span>
        <textarea rows={6} className={box} value={input} onChange={(e) => setInput(e.target.value)} />
      </label>
      {paused && <p role="status" className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-900">Hệ thống đang tạm dừng: chưa giao việc mới được.</p>}
      <button type="submit" disabled={assign.isPending || paused} className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">
        {assign.isPending ? 'Đang gửi…' : 'Giao việc'}
      </button>
    </form>
  )
}
