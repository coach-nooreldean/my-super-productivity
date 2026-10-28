import { computed, inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LS } from '../persistence/storage-keys.const';
import { DEFAULT_USER_PROFILE, UserProfile } from './user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly _matDialog = inject(MatDialog);

  readonly profile = signal<UserProfile>(this._loadProfile());

  readonly displayName = computed<string>(() => this.profile().name.trim());

  readonly hasProfile = computed<boolean>(() => {
    const p = this.profile();
    return !!p.name.trim() || !!p.avatar;
  });

  readonly initials = computed<string>(() => {
    const name = this.displayName();
    if (!name) {
      return '';
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  readonly avatar = computed<string | null>(() => this.profile().avatar);
  readonly avatarType = computed(() => this.profile().avatarType);

  updateProfile(updates: Partial<UserProfile>): void {
    const updated: UserProfile = {
      ...this.profile(),
      ...updates,
    };
    this.profile.set(updated);
    this._saveProfile(updated);
  }

  clearProfile(): void {
    this.profile.set(DEFAULT_USER_PROFILE);
    try {
      localStorage.removeItem(LS.USER_PROFILE);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  hasSeenOnboarding(): boolean {
    try {
      return localStorage.getItem(LS.HAS_SEEN_PROFILE_ONBOARDING) === 'true';
    } catch {
      return false;
    }
  }

  markOnboardingSeen(): void {
    try {
      localStorage.setItem(LS.HAS_SEEN_PROFILE_ONBOARDING, 'true');
    } catch {
      // Ignore storage errors
    }
  }

  openProfileDialog(isFirstRun = false): void {
    // Dynamic import to break any circular dependency
    import('./dialog-user-profile.component').then(({ DialogUserProfileComponent }) => {
      this._matDialog.open(DialogUserProfileComponent, {
        data: { isFirstRun },
        width: '420px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
      });
    });
  }

  private _loadProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(LS.USER_PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserProfile>;
        return {
          name: typeof parsed.name === 'string' ? parsed.name : '',
          avatar: typeof parsed.avatar === 'string' ? parsed.avatar : null,
          avatarType:
            parsed.avatarType === 'image' || parsed.avatarType === 'preset'
              ? parsed.avatarType
              : 'initials',
        };
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_USER_PROFILE;
  }

  private _saveProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(LS.USER_PROFILE, JSON.stringify(profile));
    } catch {
      // Ignore storage errors
    }
  }
}
