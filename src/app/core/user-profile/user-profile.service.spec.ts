import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { UserProfileService } from './user-profile.service';
import { LS } from '../persistence/storage-keys.const';
import { DEFAULT_USER_PROFILE } from './user-profile.model';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    localStorage.clear();
    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [UserProfileService, { provide: MatDialog, useValue: mockMatDialog }],
    });

    service = TestBed.inject(UserProfileService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with default profile when localStorage is empty', () => {
    expect(service.profile()).toEqual(DEFAULT_USER_PROFILE);
    expect(service.hasProfile()).toBe(false);
    expect(service.displayName()).toBe('');
    expect(service.initials()).toBe('');
    expect(service.avatar()).toBeNull();
  });

  it('should update profile and persist to localStorage', () => {
    service.updateProfile({
      name: 'Nooreldean Badawy',
      avatar: '🚀',
      avatarType: 'preset',
    });

    expect(service.displayName()).toBe('Nooreldean Badawy');
    expect(service.initials()).toBe('NB');
    expect(service.avatar()).toBe('🚀');
    expect(service.avatarType()).toBe('preset');
    expect(service.hasProfile()).toBe(true);

    const stored = JSON.parse(localStorage.getItem(LS.USER_PROFILE) || '{}');
    expect(stored.name).toBe('Nooreldean Badawy');
    expect(stored.avatar).toBe('🚀');
  });

  it('should compute 2-character initials for single word names', () => {
    service.updateProfile({ name: 'Alex' });
    expect(service.initials()).toBe('AL');
  });

  it('should compute first and last initials for multi-word names', () => {
    service.updateProfile({ name: 'John Doe' });
    expect(service.initials()).toBe('JD');
  });

  it('should clear profile and remove from localStorage', () => {
    service.updateProfile({ name: 'Test User' });
    expect(service.hasProfile()).toBe(true);

    service.clearProfile();
    expect(service.profile()).toEqual(DEFAULT_USER_PROFILE);
    expect(service.hasProfile()).toBe(false);
    expect(localStorage.getItem(LS.USER_PROFILE)).toBeNull();
  });

  it('should track onboarding seen status', () => {
    expect(service.hasSeenOnboarding()).toBe(false);
    service.markOnboardingSeen();
    expect(service.hasSeenOnboarding()).toBe(true);
    expect(localStorage.getItem(LS.HAS_SEEN_PROFILE_ONBOARDING)).toBe('true');
  });
});
