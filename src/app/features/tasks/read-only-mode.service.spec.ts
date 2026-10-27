import { TestBed } from '@angular/core/testing';
import { ReadOnlyModeService } from './read-only-mode.service';
import { BannerService } from '../../core/banner/banner.service';
import { BannerId } from '../../core/banner/banner.model';
import { LS } from '../../core/persistence/storage-keys.const';

describe('ReadOnlyModeService', () => {
  let service: ReadOnlyModeService;
  let bannerServiceSpy: jasmine.SpyObj<BannerService>;

  beforeEach(() => {
    localStorage.removeItem(LS.IS_READ_ONLY_MODE);
    bannerServiceSpy = jasmine.createSpyObj('BannerService', ['open', 'dismiss']);

    TestBed.configureTestingModule({
      providers: [
        ReadOnlyModeService,
        { provide: BannerService, useValue: bannerServiceSpy },
      ],
    });
  });

  afterEach(() => {
    localStorage.removeItem(LS.IS_READ_ONLY_MODE);
  });

  it('should be created and default to false when localStorage is empty', () => {
    service = TestBed.inject(ReadOnlyModeService);
    expect(service.isReadOnly()).toBeFalse();
    expect(bannerServiceSpy.open).not.toHaveBeenCalled();
  });

  it('should initialize to true and open banner if localStorage has true', () => {
    localStorage.setItem(LS.IS_READ_ONLY_MODE, 'true');
    service = TestBed.inject(ReadOnlyModeService);
    expect(service.isReadOnly()).toBeTrue();
    expect(bannerServiceSpy.open).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: BannerId.ReadOnlyMode,
        ico: 'lock',
      }),
    );
  });

  it('should enable read-only mode and open banner when setReadOnlyMode(true)', () => {
    service = TestBed.inject(ReadOnlyModeService);
    service.setReadOnlyMode(true);

    expect(service.isReadOnly()).toBeTrue();
    expect(localStorage.getItem(LS.IS_READ_ONLY_MODE)).toBe('true');
    expect(bannerServiceSpy.open).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: BannerId.ReadOnlyMode,
      }),
    );
  });

  it('should disable read-only mode and dismiss banner when setReadOnlyMode(false)', () => {
    localStorage.setItem(LS.IS_READ_ONLY_MODE, 'true');
    service = TestBed.inject(ReadOnlyModeService);
    service.setReadOnlyMode(false);

    expect(service.isReadOnly()).toBeFalse();
    expect(localStorage.getItem(LS.IS_READ_ONLY_MODE)).toBeNull();
    expect(bannerServiceSpy.dismiss).toHaveBeenCalledWith(BannerId.ReadOnlyMode);
  });

  it('should toggle read-only mode correctly', () => {
    service = TestBed.inject(ReadOnlyModeService);
    service.toggleReadOnlyMode();
    expect(service.isReadOnly()).toBeTrue();
    service.toggleReadOnlyMode();
    expect(service.isReadOnly()).toBeFalse();
  });
});
