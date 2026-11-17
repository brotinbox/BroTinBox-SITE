/** "How did you find us?" options (checkout question + admin labels). Keep in sync with migration 0047. */
export const HEARD_FROM = [
  { value: 'chatgpt', label: 'ChatGPT / AI search', emoji: '🤖' },
  { value: 'google', label: 'Google search / Maps', emoji: '🔎' },
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'friend', label: 'A friend told me', emoji: '🤝' },
  { value: 'poster', label: 'Poster / flyer', emoji: '📄' },
  { value: 'trainer', label: 'My gym trainer', emoji: '🏋️' },
  { value: 'nearby', label: 'Saw you nearby', emoji: '📍' },
  { value: 'other', label: 'Somewhere else', emoji: '💬' },
] as const;

export type HeardFromSource = (typeof HEARD_FROM)[number]['value'];

export const heardFromLabel = (v: string | null | undefined) =>
  HEARD_FROM.find((o) => o.value === v)?.label ?? v ?? '';
