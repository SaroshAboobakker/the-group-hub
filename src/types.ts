import type { MemberName } from './lib/members'

export type Message = {
  id: string
  sender_name: MemberName
  content: string
  created_at: string
}
