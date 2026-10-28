import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../t.const';
import { AvatarType, PRESET_AVATARS } from './user-profile.model';
import { UserProfileService } from './user-profile.service';

interface DialogUserProfileData {
  isFirstRun?: boolean;
}

@Component({
  selector: 'dialog-user-profile',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './dialog-user-profile.component.html',
  styleUrl: './dialog-user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogUserProfileComponent {
  private readonly _matDialogRef =
    inject<MatDialogRef<DialogUserProfileComponent>>(MatDialogRef);
  private readonly _userProfileService = inject(UserProfileService);
  private readonly _data: DialogUserProfileData =
    inject(MAT_DIALOG_DATA, {
      optional: true,
    }) || {};

  readonly T = T;
  readonly presets = PRESET_AVATARS;
  readonly isFirstRun = !!this._data?.isFirstRun;

  name: string = this._userProfileService.displayName();
  avatar: string | null = this._userProfileService.avatar();
  avatarType: AvatarType = this._userProfileService.avatarType();

  get initials(): string {
    const trimmed = this.name.trim();
    if (!trimmed) {
      return '';
    }
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    // Limit to 2MB to keep localStorage light and avoid quota issues
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (): void => {
      this.avatar = reader.result as string;
      this.avatarType = 'image';
    };
    reader.readAsDataURL(file);
  }

  selectPreset(preset: string): void {
    this.avatar = preset;
    this.avatarType = 'preset';
  }

  removeAvatar(): void {
    this.avatar = null;
    this.avatarType = 'initials';
  }

  save(): void {
    this._userProfileService.updateProfile({
      name: this.name.trim(),
      avatar: this.avatar,
      avatarType: this.avatarType,
    });
    this._userProfileService.markOnboardingSeen();
    this._matDialogRef.close(true);
  }

  skipOrCancel(): void {
    this._userProfileService.markOnboardingSeen();
    this._matDialogRef.close(false);
  }
}
