import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { TASKS_SETTINGS_FORM_CFG } from '../../config/form-cfgs/tasks-settings-form.const';
import { T } from '../../../t.const';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskComponent } from './task.component';
import { TaskService } from '../task.service';
import { TaskFocusService } from '../task-focus.service';
import { TaskMultiSelectService } from '../task-multi-select.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { Store } from '@ngrx/store';
import { DateService } from '../../../core/date/date.service';
import { MenuTreeService } from '../../menu-tree/menu-tree.service';
import { SnackService } from '../../../core/snack/snack.service';
import { TranslateService } from '@ngx-translate/core';
import { LocaleDatePipe } from '../../../ui/pipes/locale-date.pipe';
import { PlannerService } from '../../planner/planner.service';
import { AddSubtaskInputService } from '../add-subtask-input/add-subtask-input.service';
import { TaskMoveToProjectService } from '../task-move-to-project.service';
import { IssueSyncStateService } from '../../issue/two-way-sync/issue-sync-state.service';
import { ProjectService } from '../../project/project.service';
import { DateAdapter } from '@angular/material/core';
import { DEFAULT_TASK, TaskWithSubTasks } from '../task.model';
import { of } from 'rxjs';

describe('Compact Sub-Tasks View (Issue #4)', () => {
  describe('Configuration Defaults & Settings Form', () => {
    it('should have isCompactSubTasksView enabled by default in DEFAULT_GLOBAL_CONFIG', () => {
      expect(DEFAULT_GLOBAL_CONFIG.tasks.isCompactSubTasksView).toBe(true);
    });

    it('should include isCompactSubTasksView in TASKS_SETTINGS_FORM_CFG', () => {
      const field = TASKS_SETTINGS_FORM_CFG.items?.find(
        (item) => item.key === 'isCompactSubTasksView',
      );
      expect(field).toBeDefined();
      expect(field?.type).toBe('checkbox');
      expect(field?.defaultValue).toBe(true);
      expect(field?.templateOptions?.label).toBe(T.GCF.TASKS.IS_COMPACT_SUB_TASKS_VIEW);
    });
  });

  describe('TaskComponent isCompactSubTasksView computation', () => {
    let cfgSignal: WritableSignal<any>;
    let fixture: import('@angular/core/testing').ComponentFixture<TaskComponent>;
    let component: TaskComponent;

    const createMockTask = (parentId?: string): TaskWithSubTasks => ({
      ...DEFAULT_TASK,
      id: 'task-test',
      title: 'Task title',
      projectId: 'proj-1',
      parentId,
      subTasks: [],
    });

    beforeEach(async () => {
      cfgSignal = signal({
        tasks: {
          isCompactSubTasksView: true,
        },
      });

      const mockConfigService = {
        cfg: cfgSignal,
      };

      const mockTaskService = {
        currentTaskId: signal(null),
        selectedTaskId: signal(null),
        focusTaskId: signal(null),
      };

      const mockMultiSelect = {
        selectedIds: signal(new Set<string>()),
        isTouchSelectionMode: signal(false),
      };

      const mockLayoutService = {
        isXs: () => false,
      };

      const mockGlobalTrackingInterval = {
        todayDateStr: () => '2026-10-26',
      };

      const mockWorkContextService = {
        activeWorkContext$: of({ isEnableBacklog: false }),
      };

      const mockStore = {
        dispatch: jasmine.createSpy('dispatch'),
        select: () => of(null),
      };

      const mockTranslate = {
        instant: (k: string) => k,
      };

      await TestBed.configureTestingModule({
        imports: [TaskComponent],
        providers: [
          { provide: GlobalConfigService, useValue: mockConfigService },
          { provide: TaskService, useValue: mockTaskService },
          { provide: TaskMultiSelectService, useValue: mockMultiSelect },
          { provide: LayoutService, useValue: mockLayoutService },
          {
            provide: GlobalTrackingIntervalService,
            useValue: mockGlobalTrackingInterval,
          },
          { provide: WorkContextService, useValue: mockWorkContextService },
          { provide: Store, useValue: mockStore },
          { provide: TranslateService, useValue: mockTranslate },
          { provide: TaskFocusService, useValue: {} },
          { provide: DateService, useValue: {} },
          { provide: MenuTreeService, useValue: {} },
          { provide: SnackService, useValue: {} },
          { provide: LocaleDatePipe, useValue: {} },
          { provide: PlannerService, useValue: {} },
          {
            provide: AddSubtaskInputService,
            useValue: { openRequest: signal(null), consume: () => {} },
          },
          { provide: TaskMoveToProjectService, useValue: {} },
          { provide: IssueSyncStateService, useValue: {} },
          { provide: ProjectService, useValue: { getByIdOnce$: () => of(null) } },
          { provide: DateAdapter, useValue: {} },
        ],
      })
        .overrideComponent(TaskComponent, {
          set: { template: '<div></div>' },
        })
        .compileComponents();

      fixture = TestBed.createComponent(TaskComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('task', createMockTask());
      fixture.detectChanges();
    });

    it('should compute isCompactSubTasksView as true when config is true', () => {
      expect(component.isCompactSubTasksView()).toBe(true);
    });

    it('should reactively update isCompactSubTasksView when config changes', () => {
      cfgSignal.set({
        tasks: {
          isCompactSubTasksView: false,
        },
      });
      expect(component.isCompactSubTasksView()).toBe(false);
    });

    it('should default to true if tasks.isCompactSubTasksView is undefined', () => {
      cfgSignal.set({
        tasks: {},
      });
      expect(component.isCompactSubTasksView()).toBe(true);
    });

    it('should correctly identify a subtask with compact view', () => {
      fixture.componentRef.setInput('task', createMockTask('parent-task-1'));
      fixture.componentRef.setInput('isInSubTaskList', true);
      fixture.detectChanges();

      expect(component.isSubTask()).toBe(true);
      expect(component.isCompactSubTasksView()).toBe(true);
    });
  });
});
