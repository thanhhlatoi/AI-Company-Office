import type { Conversation, Message } from '../../types/history'

const ROLE = { USER: 'Người dùng', ASSISTANT: 'AI', TOOL: 'Công cụ' } as const

/** Markdown của cả hội thoại (nội dung đã được BE che bí mật, FE không thêm gì). */
export function toMarkdown(c: Conversation, agentName: string, messages: Message[]): string {
  const head = `# ${c.title}\n\n- Agent: ${agentName}\n- Bắt đầu: ${c.startedAt}\n- Số tin: ${messages.length}\n- Token: ${c.tokens}\n`
  const body = messages.map((m) => {
    const tool = m.toolName ? `\n\n\`\`\`json\n${JSON.stringify(m.toolArgs ?? {}, null, 2)}\n\`\`\`` : ''
    return `## ${ROLE[m.role]}${m.toolName ? ` · ${m.toolName}` : ''} (${m.createdAt})${m.truncated ? ' [bị cắt bớt]' : ''}${tool}\n\n${m.content}`
  })
  return `${head}\n${body.join('\n\n')}\n`
}

export const toJson = (c: Conversation, messages: Message[]) => JSON.stringify({ conversation: c, messages }, null, 2)

/** Tải một chuỗi thành tệp. */
export function download(name: string, mime: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: `${mime};charset=utf-8` }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
