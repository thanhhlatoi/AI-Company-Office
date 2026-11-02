import { Client, ReconnectionTimeMode } from '@stomp/stompjs'
import type { QueryClient } from '@tanstack/react-query'
import { STOMP_AGENTS_TOPIC, USE_MOCK, WS_URL } from '../lib/config'
import { startSimulator } from '../mocks/simulator'
import { useRealtimeStore } from '../store/realtimeStore'
import { dispatch } from './dispatch'
import { catchUp } from './eventSync'

/** Mở kết nối realtime (mock hoặc STOMP thật). Trả về hàm đóng. */
export function connectRealtime(qc: QueryClient): () => void {
  const { setConnection } = useRealtimeStore.getState()
  const onMessage = (raw: unknown) => dispatch(raw, qc)

  if (USE_MOCK) {
    setConnection('connected')
    const stop = startSimulator(onMessage, () => void catchUp())
    return () => { stop(); setConnection('disconnected') }
  }

  let hasConnected = false
  const client = new Client({
    brokerURL: WS_URL,
    // Tự nối lại với khoảng chờ tăng dần 1s, 2s, 4s... tối đa 30s
    reconnectDelay: 1000,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    maxReconnectDelay: 30000,
    onConnect: () => {
      setConnection('connected')
      client.subscribe(STOMP_AGENTS_TOPIC, (frame) => {
        try {
          onMessage(JSON.parse(frame.body))
        } catch {
          console.error('[Realtime] body không phải JSON:', frame.body)
        }
      })
      // Nối lại sau khi mất kết nối (hoặc lần đầu mà API từng lỗi): có thể đã lỡ event -> tải lại để đồng bộ
      if (hasConnected || qc.getQueryState(['agents'])?.status === 'error') {
        void qc.invalidateQueries({ queryKey: ['agents'] })
        void qc.invalidateQueries({ queryKey: ['devices'] })
        void qc.invalidateQueries({ queryKey: ['network'] })
        void catchUp() // bù sự kiện giao việc đã lỡ trong lúc mất kết nối
      }
      hasConnected = true
    },
    onWebSocketClose: () => setConnection('connecting'),
    onStompError: (f) => console.error('[Realtime] STOMP error:', f.headers['message'], f.body),
  })
  setConnection('connecting')
  client.activate()
  return () => { void client.deactivate(); setConnection('disconnected') }
}
