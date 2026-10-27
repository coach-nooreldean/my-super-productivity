import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { CompletedTasksPageComponent } from './completed-tasks-page.component';
import { TaskService } from '../../features/tasks/task.service';
import { TaskArchiveService } from '../../features/archive/task-archive.service';
import { ProjectService } from '../../features/project/project.service';
import { DateService } from '../../core/date/date.service';
import { SnackService } from '../../core/snack/snack.service';
import { Task, TaskArchive } from '../../features/tasks/task.model';
import { Project } from '../../features/project/project.model';
import { selectAllProjectColorsAndTitles } from '../../features/project/store/project.selectors';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';

const makeTask = (id: string, title: string, over: Partial<Task> = {}): Task =>
  ({
    id,
    title,
    isDone: true,
    doneOn: 1700000000000,
    projectId: 'p_1',
    subTaskIds: [],
    tagIds: [],
    timeSpentOnDay: {},
    ...over,
  }) as unknown as Task;

const makeProject = (id: string, title: string): Project =>
  ({
    id,
    title,
    theme: { primary: '#4caf50' },
  }) as unknown as Project;

describe('CompletedTasksPageComponent', () => {
  let fixture: ComponentFixture<CompletedTasksPageComponent>;
  let component: CompletedTasksPageComponent;
  let store: MockStore;
  let taskService: jasmine.SpyObj<TaskService>;
  let taskArchiveService: jasmine.SpyObj<TaskArchiveService>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let dateService: jasmine.SpyObj<DateService>;
  let snackService: jasmine.SpyObj<SnackService>;
  let matDialog: jasmine.SpyObj<MatDialog>;

  const setUp = async (
    activeTasks: Task[],
    archivedTasks: Task[],
    projects: Project[] = [makeProject('p_1', 'Project 1')],
    queryParams: Record<string, string> = {},
  ): Promise<void> => {
    taskService = jasmine.createSpyObj('TaskService', ['setUnDone', 'getArchivedTasks'], {
      allTasks$: of(activeTasks),
    });
    taskService.getArchivedTasks.and.returnValue(Promise.resolve(archivedTasks));

    taskArchiveService = jasmine.createSpyObj('TaskArchiveService', ['load']);
    taskArchiveService.load.and.returnValue(
      Promise.resolve({ ids: [], entities: {} } as unknown as TaskArchive),
    );

    projectService = jasmine.createSpyObj('ProjectService', [], {
      list$: of(projects),
    });

    dateService = jasmine.createSpyObj('DateService', [
      'todayStr',
      'getStartOfNextDayDiffMs',
      'isToday',
    ]);
    dateService.todayStr.and.returnValue('2026-10-28');
    dateService.getStartOfNextDayDiffMs.and.returnValue(0);
    dateService.isToday.and.returnValue(false);

    snackService = jasmine.createSpyObj('SnackService', ['open']);
    matDialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        CompletedTasksPageComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            {
              selector: selectAllProjectColorsAndTitles,
              value: {
                p_1: { title: 'Project 1', color: '#4caf50' },
                p_2: { title: 'Project 2', color: '#2196f3' },
              },
            },
          ],
        }),
        { provide: TaskService, useValue: taskService },
        { provide: TaskArchiveService, useValue: taskArchiveService },
        { provide: ProjectService, useValue: projectService },
        { provide: DateService, useValue: dateService },
        { provide: SnackService, useValue: snackService },
        { provide: MatDialog, useValue: matDialog },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams } },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(CompletedTasksPageComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  };

  it('renders the empty state when there are no completed tasks', async () => {
    await setUp([], []);
    const empty = fixture.debugElement.query(By.css('.empty-state'));
    expect(empty).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.task-list'))).toBeNull();
  });

  it('renders rows for both active completed and archived tasks', async () => {
    const active = [makeTask('t-active', 'Active Done Task')];
    const archived = [makeTask('t-archived', 'Archived Task')];
    await setUp(active, archived);

    const rows = fixture.debugElement.queryAll(By.css('.task-row'));
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Active Done Task');
    expect(fixture.nativeElement.textContent).toContain('Archived Task');
  });

  it('filters rows by search term', async () => {
    const active = [
      makeTask('t-1', 'Write documentation'),
      makeTask('t-2', 'Fix security bug'),
    ];
    await setUp(active, []);

    component.searchTerm.set('security');
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('.task-row'));
    expect(rows.length).toBe(1);
    expect(rows[0].nativeElement.textContent).toContain('Fix security bug');
  });

  it('filters rows by project', async () => {
    const tasks = [
      makeTask('t-1', 'Task for Project 1', { projectId: 'p_1' }),
      makeTask('t-2', 'Task for Project 2', { projectId: 'p_2' }),
    ];
    await setUp(
      tasks,
      [],
      [makeProject('p_1', 'Project 1'), makeProject('p_2', 'Project 2')],
    );

    component.selectedProjectId.set('p_2');
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('.task-row'));
    expect(rows.length).toBe(1);
    expect(rows[0].nativeElement.textContent).toContain('Task for Project 2');
  });

  it('calls TaskService.setUnDone when uncompleting an active task', async () => {
    const active = [makeTask('t-active', 'Active Task')];
    await setUp(active, []);

    const restoreBtn = fixture.debugElement.query(By.css('.task-actions button'));
    restoreBtn.nativeElement.click();

    expect(taskService.setUnDone).toHaveBeenCalledWith('t-active');
    expect(snackService.open).toHaveBeenCalled();
  });

  it('dispatches TaskSharedActions.restoreTask when uncompleting an archived task', async () => {
    const archived = [makeTask('t-archived', 'Archived Task')];
    await setUp([], archived);

    const restoreBtn = fixture.debugElement.query(By.css('.task-actions button'));
    restoreBtn.nativeElement.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: TaskSharedActions.restoreTask.type,
      }),
    );
    expect(snackService.open).toHaveBeenCalled();
  });
});
