import { TestBed } from '@angular/core/testing';
import {
  LS_PROJECT_VIEW_MODE_PREFIX,
  ProjectViewModeService,
} from './project-view-mode.service';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContextType } from '../work-context/work-context.model';
import { BehaviorSubject } from 'rxjs';

describe('ProjectViewModeService', () => {
  let service: ProjectViewModeService;
  let activeWorkContextTypeAndId$: BehaviorSubject<{
    activeId: string;
    activeType: WorkContextType;
  } | null>;

  beforeEach(() => {
    localStorage.clear();
    activeWorkContextTypeAndId$ = new BehaviorSubject<{
      activeId: string;
      activeType: WorkContextType;
    } | null>({
      activeId: 'p1',
      activeType: WorkContextType.PROJECT,
    });

    TestBed.configureTestingModule({
      providers: [
        ProjectViewModeService,
        {
          provide: WorkContextService,
          useValue: {
            activeWorkContextTypeAndId$: activeWorkContextTypeAndId$.asObservable(),
          },
        },
      ],
    });

    service = TestBed.inject(ProjectViewModeService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and default to LIST view', () => {
    expect(service).toBeTruthy();
    expect(service.currentViewMode()).toBe('LIST');
    expect(service.isKanbanView()).toBe(false);
  });

  it('should toggle view mode to KANBAN and persist in localStorage', () => {
    service.toggleViewMode();
    TestBed.flushEffects();

    expect(service.currentViewMode()).toBe('KANBAN');
    expect(service.isKanbanView()).toBe(true);
    expect(localStorage.getItem(`${LS_PROJECT_VIEW_MODE_PREFIX}p1`)).toBe('KANBAN');
  });

  it('should toggle back to LIST view and persist', () => {
    service.setViewMode('KANBAN');
    TestBed.flushEffects();
    expect(service.isKanbanView()).toBe(true);

    service.toggleViewMode();
    TestBed.flushEffects();
    expect(service.currentViewMode()).toBe('LIST');
    expect(service.isKanbanView()).toBe(false);
    expect(localStorage.getItem(`${LS_PROJECT_VIEW_MODE_PREFIX}p1`)).toBe('LIST');
  });

  it('should load saved preference for active project', () => {
    localStorage.setItem(`${LS_PROJECT_VIEW_MODE_PREFIX}p2`, 'KANBAN');
    activeWorkContextTypeAndId$.next({
      activeId: 'p2',
      activeType: WorkContextType.PROJECT,
    });
    TestBed.flushEffects();

    expect(service.currentViewMode()).toBe('KANBAN');
    expect(service.isKanbanView()).toBe(true);
  });

  it('should return false for isKanbanView if context is not a project', () => {
    service.setViewMode('KANBAN');
    activeWorkContextTypeAndId$.next({
      activeId: 't1',
      activeType: WorkContextType.TAG,
    });
    TestBed.flushEffects();

    expect(service.isProject()).toBe(false);
    expect(service.isKanbanView()).toBe(false);
  });
});
