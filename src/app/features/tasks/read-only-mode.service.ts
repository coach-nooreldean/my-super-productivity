import { inject, Injectable, signal } from '@angular/core';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { LS } from '../../core/persistence/storage-keys.const';
import { T } from '../../t.const';

@Injectable({
  providedIn: 'root',
})
export class ReadOnlyModeService {
  private readonly _bannerService = inject(BannerService);

  private readonly _isReadOnly = signal<boolean>(this._readInitialState());
  readonly isReadOnly = this._isReadOnly.asReadonly();

  constructor() {
    if (this._isReadOnly()) {
      this._openBanner();
    }
  }

  setReadOnlyMode(isReadOnly: boolean): void {
    this._isReadOnly.set(isReadOnly);
    if (isReadOnly) {
      localStorage.setItem(LS.IS_READ_ONLY_MODE, 'true');
      this._openBanner();
    } else {
      localStorage.removeItem(LS.IS_READ_ONLY_MODE);
      this._bannerService.dismiss(BannerId.ReadOnlyMode);
    }
  }

  toggleReadOnlyMode(): void {
    this.setReadOnlyMode(!this._isReadOnly());
  }

  private _readInitialState(): boolean {
    try {
      return localStorage.getItem(LS.IS_READ_ONLY_MODE) === 'true';
    } catch {
      return false;
    }
  }

  private _openBanner(): void {
    this._bannerService.open({
      id: BannerId.ReadOnlyMode,
      ico: 'lock',
      msg: T.APP.B_READ_ONLY_MODE.MSG,
      action: {
        label: T.APP.B_READ_ONLY_MODE.UNLOCK,
        fn: () => this.setReadOnlyMode(false),
      },
      isHideDismissBtn: true,
    });
  }
}
