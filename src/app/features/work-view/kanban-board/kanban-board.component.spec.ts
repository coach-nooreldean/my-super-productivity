import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KanbanBoardComponent } from './kanban-board.component';
import { TranslateModule } from '@ngx-translate/core';
import { SectionService } from '../../section/section.service';
import { TaskService } from '../../tasks/task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { SnackService } from '../../../core/snack/snack.service';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Section } from '../../section/section.model';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { of } from 'rxjs';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { WorkContextType } from '../../work-context/work-context.model';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { TaskMultiDragService } from '../../tasks/task-multi-drag.service';
import { TaskViewCustomizerService } from '../../task-view-customizer/task-view-customizer.service';
import { ScheduleExternalDragService } from '../../schedule/schedule-week/schedule-external-drag.service';
import { DropListService } from '../../../core-ui/drop-list/drop-list.service';

import { ProjectService } from '../../project/project.service';
import { provideNativeDateAdapter } from '@angular/material/core';
import { LocaleDatePipe } from '../../../ui/pipes/locale-date.pipe';

describe('KanbanBoardComponent', () => {
  let component: KanbanBoardComponent;
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let sectionServiceMock: jasmine.SpyObj<SectionService>;
  let taskServiceMock: jasmine.SpyObj<TaskService>;
  let workContextServiceMock: jasmine.SpyObj<WorkContextService>;
  let snackServiceMock: jasmine.SpyObj<SnackService>;
  let matDialogMock: jasmine.SpyObj<MatDialog>;

  const mockSections: Section[] = [
    {
      id: 'sec_1',
      title: 'In Progress',
      contextId: 'p1',
      contextType: WorkContextType.PROJECT,
      taskIds: ['t1'],
    },
    {
      id: 'sec_2',
      title: 'Review',
      contextId: 'p1',
      contextType: WorkContextType.PROJECT,
      taskIds: ['t2'],
    },
  ];

  const mockTasks: TaskWithSubTasks[] = [
    {
      id: 't0',
      title: 'Task 0',
      subTasks: [],
      subTaskIds: [],
      tagIds: [],
      isDone: false,
    } as any,
    {
      id: 't1',
      title: 'Task 1',
      subTasks: [],
      subTaskIds: [],
      tagIds: [],
      isDone: false,
    } as any,
    {
      id: 't2',
      title: 'Task 2',
      subTasks: [],
      subTaskIds: [],
      tagIds: [],
      isDone: false,
    } as any,
  ];

  beforeEach(async () => {
    sectionServiceMock = jasmine.createSpyObj('SectionService', [
      'updateSectionOrder',
      'addSection',
      'updateSection',
      'deleteSection',
      'addTaskToSection',
    ]);
    taskServiceMock = jasmine.createSpyObj(
      'TaskService',
      [
        'setDone',
        'setUnDone',
        'moveToArchive',
        'updateTags',
        'showSubTasks',
        'focusTaskIfPossible',
      ],
      {
        currentTaskId$: of(null),
        currentTaskId: () => null,
        selectedTaskId: () => null,
        timeConflictTaskIds: () => new Set(),
        getByIdLive$: () => of(null),
      },
    );
    workContextServiceMock = jasmine.createSpyObj('WorkContextService', [], {
      activeWorkContextId: 'p1',
      activeWorkContextType: WorkContextType.PROJECT,
      activeWorkContextTypeAndId$: of({
        activeId: 'p1',
        activeType: WorkContextType.PROJECT,
      }),
    });
    snackServiceMock = jasmine.createSpyObj('SnackService', ['open']);
    matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent, TranslateModule.forRoot()],
      providers: [
        provideNativeDateAdapter(),
        provideNoopAnimations(),
        {
          provide: LocaleDatePipe,
          useValue: {
            transform: (val: any) => (val ? String(val) : null),
          },
        },
        provideMockStore({ initialState: {} }),
        provideMockActions(() => of()),
        { provide: TaskViewCustomizerService, useValue: { setSort: () => {} } },
        {
          provide: ScheduleExternalDragService,
          useValue: {
            activeTask: () => null,
            setActiveTask: () => {},
            isCancelNextDrop: () => false,
            setCancelNextDrop: () => {},
          },
        },
        {
          provide: DropListService,
          useValue: {
            dropLists: of([]),
            registerDropList: () => {},
            unregisterDropList: () => {},
            setActiveDragPointer: () => {},
            markSubTaskDragStarting: () => {},
            isSubTaskDragStarting: () => false,
            blockAniTrigger$: { next: () => {} },
            isBlockAniAfterDrop$: of(false),
          },
        },
        {
          provide: TaskMultiDragService,
          useValue: {
            selectedIds: () => new Set(),
            draggedIds: () => new Set(),
            previewTasks: () => [],
            selectionSize: () => 0,
            isListGroupDrag: () => false,
            start: () => {},
            clear: () => {},
            finish: () => {},
            canDrop: () => false,
            isPlacementUnchanged: () => false,
            drop: () => Promise.resolve(),
          },
        },
        {
          provide: ProjectService,
          useValue: {
            getByIdLive$: () => of(null),
            getByIdOnce$: () => of(null),
          },
        },
        { provide: SectionService, useValue: sectionServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: WorkContextService, useValue: workContextServiceMock },
        { provide: SnackService, useValue: snackServiceMock },
        { provide: MatDialog, useValue: matDialogMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('sections', mockSections);
    fixture.componentRef.setInput('undoneTasksBySection', {
      dict: { sec_1: [mockTasks[1]], sec_2: [mockTasks[2]] },
      noSection: [mockTasks[0]],
    });
    fixture.componentRef.setInput('doneTasks', []);
    fixture.componentRef.setInput('undoneTasks', mockTasks);

    fixture.detectChanges();
  });

  it('should create and render columns', () => {
    expect(component).toBeTruthy();
    const columns = fixture.nativeElement.querySelectorAll('.kanban-column');
    // no-section column + 2 section columns + done column = 4 columns
    expect(columns.length).toBe(4);
  });

  it('should reorder sections when dropped', () => {
    const event = {
      previousIndex: 0,
      currentIndex: 1,
    } as CdkDragDrop<Section[]>;

    component.dropSection(event);
    expect(sectionServiceMock.updateSectionOrder).toHaveBeenCalledWith('p1', [
      'sec_2',
      'sec_1',
    ]);
  });

  it('should add task to a section when task added in section column', () => {
    component.onTaskAddedToSection('sec_1', { taskId: 't3' } as any);
    expect(sectionServiceMock.addTaskToSection).toHaveBeenCalledWith(
      'sec_1',
      't3',
      null,
      null,
    );
  });

  it('should mark task done when added in done column', () => {
    component.onTaskAddedToDone({ taskId: 't4' } as any);
    expect(taskServiceMock.setDone).toHaveBeenCalledWith('t4');
  });

  it('should open prompt dialog and add new section', async () => {
    matDialogMock.open.and.returnValue({
      afterClosed: () => of('New Section Title'),
    } as any);

    await component.addSection();
    expect(sectionServiceMock.addSection).toHaveBeenCalledWith(
      'New Section Title',
      'p1',
      WorkContextType.PROJECT,
    );
  });
});
