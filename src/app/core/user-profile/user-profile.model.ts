export type AvatarType = 'image' | 'preset' | 'initials';

export interface UserProfile {
  name: string;
  avatar: string | null; // data URL (base64) or preset emoji/identifier
  avatarType: AvatarType;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: '',
  avatar: null,
  avatarType: 'initials',
};

export const PRESET_AVATARS: readonly string[] = [
  '⚡',
  '🚀',
  '🎯',
  '💡',
  '🌟',
  '🔥',
  '☕',
  '💻',
  '🦁',
  '🐱',
  '🦉',
  '🌿',
  '🎨',
  '📚',
  '🏆',
  '🧘',
];
