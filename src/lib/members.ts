export const members = [
  { name: 'Marc', initials: 'M', color: '#e9a46f', tint: 'rgba(233, 164, 111, .14)' },
  { name: 'Willson', initials: 'W', color: '#87b8a0', tint: 'rgba(135, 184, 160, .14)' },
  { name: 'Nando', initials: 'N', color: '#a8a0e2', tint: 'rgba(168, 160, 226, .14)' },
  { name: 'Rosh', initials: 'R', color: '#e58d9a', tint: 'rgba(229, 141, 154, .14)' },
] as const

export type MemberName = (typeof members)[number]['name']

export function getMember(name: string) {
  return members.find((member) => member.name === name) ?? members[0]
}
