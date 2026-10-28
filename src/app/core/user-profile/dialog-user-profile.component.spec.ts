import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogUserProfileComponent } from './dialog-user-profile.component';
import { UserProfileService } from './user-profile.service';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('DialogUserProfileComponent', () => {
  let component: DialogUserProfileComponent;
  let fixture: ComponentFixture<DialogUserProfileComponent>;
  let mockMatDialogRef: jasmine.SpyObj<MatDialogRef<DialogUserProfileComponent>>;
  let userProfileService: UserProfileService;

  beforeEach(async () => {
    localStorage.clear();
    mockMatDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        DialogUserProfileComponent,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
      ],
      providers: [
        UserProfileService,
        { provide: MatDialogRef, useValue: mockMatDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { isFirstRun: true } },
      ],
    }).compileComponents();

    userProfileService = TestBed.inject(UserProfileService);
    fixture = TestBed.createComponent(DialogUserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and detect isFirstRun true', () => {
    expect(component).toBeTruthy();
    expect(component.isFirstRun).toBe(true);
  });

  it('should select a preset avatar', () => {
    component.selectPreset('🚀');
    expect(component.avatar).toBe('🚀');
    expect(component.avatarType).toBe('preset');
  });

  it('should remove avatar', () => {
    component.selectPreset('🦁');
    component.removeAvatar();
    expect(component.avatar).toBeNull();
    expect(component.avatarType).toBe('initials');
  });

  it('should save profile and close dialog on save()', () => {
    component.name = 'Test User';
    component.selectPreset('⚡');
    component.save();

    expect(userProfileService.displayName()).toBe('Test User');
    expect(userProfileService.avatar()).toBe('⚡');
    expect(userProfileService.hasSeenOnboarding()).toBe(true);
    expect(mockMatDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should mark onboarding seen and close without saving on skipOrCancel()', () => {
    component.skipOrCancel();
    expect(userProfileService.hasSeenOnboarding()).toBe(true);
    expect(mockMatDialogRef.close).toHaveBeenCalledWith(false);
  });
});
