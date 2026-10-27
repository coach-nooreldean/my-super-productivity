import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { T } from '../../t.const';
import { Task, TaskWithSubTasks } from '../../features/tasks/task.model';
import { TaskService } from '../../features/tasks/task.service';
import { TaskArchiveService } from '../../features/archive/task-archive.service';
import { ProjectService } from '../../features/project/project.service';
import { Project } from '../../features/project/project.model';
import { DateService } from '../../core/date/date.service';
import { SnackService } from '../../core/snack/snack.service';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';
import { selectAllProjectColorsAndTitles } from '../../features/project/store/project.selectors';
import { DialogViewArchivedTaskComponent } from '../../features/tasks/dialog-view-archived-task/dialog-view-archived-task.component';
import {
  DEFAULT_PROJECT_ICON,
  INBOX_PROJECT,
} from '../../features/project/project.const';
import { Log } from '../../core/log';

export interface CompletedTaskItem {
  task: Task;
  isArchived: boolean;
  completionTime: number;
  projectTitle: string;
  projectColor: string | null;
  projectIcon: string;
}

@Component({
  selector: 'completed-tasks-page',
  templateUrl: './completed-tasks-page.component.html',
  styleUrls: ['./completed-tasks-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    TranslatePipe,
    MatIconButton,
    MatButton,
    MatIcon,
    MatTooltip,
    MatFormField,
    MatLabel,
    MatInput,
    MatSuffix,
    MatSelect,
    MatOption,
    MatProgressSpinner,
  ],
})
export class CompletedTasksPageComponent implements OnInit {
  private readonly _store = inject(Store);
  private readonly _taskService = inject(TaskService);
  private readonly _taskArchiveService = inject(TaskArchiveService);
  private readonly _projectService = inject(ProjectService);
  private readonly _dateService = inject(DateService);
  private readonly _snackService = inject(SnackService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _route = inject(ActivatedRoute);

  readonly T = T;
  readonly DEFAULT_PROJECT_ICON = DEFAULT_PROJECT_ICON;

  readonly searchTerm = signal('');
  readonly selectedProjectId = signal<string>('ALL');
  readonly selectedDateRange = signal<string>('all');
  readonly isLoading = signal(true);

  private readonly _archivedTasks = signal<Task[]>([]);

  private readonly _activeDoneTasks = toSignal(
    this._taskService.allTasks$.pipe(
      map((tasks) => tasks.filter((t) => t.isDone && !t.parentId)),
    ),
    { initialValue: [] as Task[] },
  );

  readonly projects = toSignal(this._projectService.list$, {
    initialValue: [] as Project[],
  });

  private readonly _allProjectsColorAndTitle = this._store.selectSignal(
    selectAllProjectColorsAndTitles,
  );

  private readonly _archivedTaskIds = computed(
    () => new Set(this._archivedTasks().map((t) => t.id)),
  );

  readonly allCompletedItems = computed<CompletedTaskItem[]>(() => {
    const activeTasks = this._activeDoneTasks();
    const archived = this._archivedTasks();
    const projectColors = this._allProjectsColorAndTitle();
    const projects = this.projects();
    const projectIconMap = new Map(
      projects.map((p) => [p.id, p.icon || DEFAULT_PROJECT_ICON]),
    );

    const seenIds = new Set<string>();
    const items: CompletedTaskItem[] = [];

    // Active done tasks first
    for (const task of activeTasks) {
      seenIds.add(task.id);
      const completionTime = task.doneOn || task.modified || task.created || 0;
      const isInbox = !task.projectId || task.projectId === INBOX_PROJECT.id;
      const projectTitle = isInbox
        ? INBOX_PROJECT.title
        : projectColors[task.projectId]?.title || '';
      const projectColor = isInbox ? null : projectColors[task.projectId]?.color || null;
      const projectIcon = isInbox
        ? 'inbox'
        : projectIconMap.get(task.projectId) || DEFAULT_PROJECT_ICON;

      items.push({
        task,
        isArchived: false,
        completionTime,
        projectTitle,
        projectColor,
        projectIcon,
      });
    }

    // Archived tasks
    for (const task of archived) {
      if (seenIds.has(task.id) || !!task.parentId) continue;
      seenIds.add(task.id);
      const completionTime = task.doneOn || task.modified || task.created || 0;
      const isInbox = !task.projectId || task.projectId === INBOX_PROJECT.id;
      const projectTitle = isInbox
        ? INBOX_PROJECT.title
        : projectColors[task.projectId]?.title || '';
      const projectColor = isInbox ? null : projectColors[task.projectId]?.color || null;
      const projectIcon = isInbox
        ? 'inbox'
        : projectIconMap.get(task.projectId) || DEFAULT_PROJECT_ICON;

      items.push({
        task,
        isArchived: true,
        completionTime,
        projectTitle,
        projectColor,
        projectIcon,
      });
    }

    // Sort chronologically, newest completed first
    items.sort((a, b) => b.completionTime - a.completionTime);
    return items;
  });

  readonly filteredItems = computed<CompletedTaskItem[]>(() => {
    const items = this.allCompletedItems();
    const term = this.searchTerm().trim().toLowerCase();
    const projId = this.selectedProjectId();
    const dateRange = this.selectedDateRange();

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const yesterdayStart = todayStart - 86400000;
    const SEVEN_DAYS_MS = 7 * 86400000;
    const THIRTY_DAYS_MS = 30 * 86400000;
    const sevenDaysAgo = now.getTime() - SEVEN_DAYS_MS;
    const thirtyDaysAgo = now.getTime() - THIRTY_DAYS_MS;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return items.filter((item) => {
      // 1. Project filter
      if (projId !== 'ALL') {
        if (projId === INBOX_PROJECT.id) {
          if (item.task.projectId && item.task.projectId !== INBOX_PROJECT.id)
            return false;
        } else if (item.task.projectId !== projId) {
          return false;
        }
      }

      // 2. Date filter
      if (dateRange !== 'all') {
        const time = item.completionTime;
        if (dateRange === 'today' && time < todayStart) return false;
        if (dateRange === 'yesterday' && (time < yesterdayStart || time >= todayStart))
          return false;
        if (dateRange === '7days' && time < sevenDaysAgo) return false;
        if (dateRange === '30days' && time < thirtyDaysAgo) return false;
        if (dateRange === 'thisMonth' && time < thisMonthStart) return false;
      }

      // 3. Search query
      if (term) {
        const titleMatch = item.task.title.toLowerCase().includes(term);
        const notesMatch = item.task.notes
          ? item.task.notes.toLowerCase().includes(term)
          : false;
        if (!titleMatch && !notesMatch) return false;
      }

      return true;
    });
  });

  async ngOnInit(): Promise<void> {
    const qp = this._route.snapshot.queryParams;
    if (qp['projectId']) {
      this.selectedProjectId.set(qp['projectId']);
    }

    try {
      const archived = await this._taskService.getArchivedTasks();
      this._archivedTasks.set(archived.filter((t) => !t.parentId));
    } catch (err) {
      Log.err('Failed to load archived tasks', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async uncompleteTask(item: CompletedTaskItem): Promise<void> {
    const { task, isArchived } = item;

    if (isArchived) {
      let subTasks: Task[] | undefined;
      if (task.subTaskIds && task.subTaskIds.length) {
        try {
          const archiveState = await this._taskArchiveService.load();
          subTasks = task.subTaskIds
            .map((id) => archiveState.entities[id])
            .filter((t): t is Task => !!t);
        } catch (e) {
          Log.warn('Could not load subtasks from archive', e);
        }
      }

      const restoreToToday = {
        today: this._dateService.todayStr(),
        startOfNextDayDiffMs: this._dateService.getStartOfNextDayDiffMs(),
      };

      Log.log('RESTORE_TASK_FROM_COMPLETED_PAGE', {
        taskId: task.id,
        subTaskCount: subTasks?.length,
      });

      this._store.dispatch(
        TaskSharedActions.restoreTask({
          task: task as unknown as TaskWithSubTasks,
          subTasks: subTasks || [],
          restoreToToday,
        }),
      );

      // Remove from archived tasks locally so UI updates immediately
      this._archivedTasks.update((list) => list.filter((t) => t.id !== task.id));
    } else {
      this._taskService.setUnDone(task.id);
    }

    this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.COMPLETED_TASKS.TASK_RESTORED,
    });
  }

  viewTaskDetails(task: Task): void {
    this._matDialog.open(DialogViewArchivedTaskComponent, {
      restoreFocus: true,
      data: { task },
    });
  }
}
