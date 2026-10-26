import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
} from '@angular/core';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { SectionService } from '../../section/section.service';
import { Section } from '../../section/section.model';
import { TaskService } from '../../tasks/task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskListComponent } from '../../tasks/task-list/task-list.component';
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { TaskAddEvent } from '../../tasks/add-task-bar/add-task-bar.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogPromptComponent } from '../../../ui/dialog-prompt/dialog-prompt.component';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { SnackService } from '../../../core/snack/snack.service';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { dragDelayForTouch } from '../../../util/input-intent';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'kanban-board',
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    MatIcon,
    MatButton,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatTooltip,
    TranslatePipe,
    TaskListComponent,
    AddTaskInlineComponent,
  ],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanBoardComponent {
  readonly sections = input.required<readonly Section[]>();
  readonly undoneTasksBySection = input.required<{
    dict: Record<string, TaskWithSubTasks[]>;
    noSection: TaskWithSubTasks[];
  }>();
  readonly doneTasks = input.required<TaskWithSubTasks[]>();
  readonly undoneTasks = input.required<TaskWithSubTasks[]>();

  sectionService = inject(SectionService);
  taskService = inject(TaskService);
  workContextService = inject(WorkContextService);
  private _matDialog = inject(MatDialog);
  private _snackService = inject(SnackService);
  private _destroyRef = inject(DestroyRef);

  readonly T = T;
  readonly dragDelayForTouch = dragDelayForTouch;

  acceptSectionDragOnly = (drag: CdkDrag): boolean => {
    const data = drag.data as Section | undefined;
    return !!data && 'contextType' in data;
  };

  dropSection(event: CdkDragDrop<Section[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const contextId = this.workContextService.activeWorkContextId;
    if (!contextId) return;

    const ids = this.sections().map((s) => s.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.sectionService.updateSectionOrder(contextId, ids);
  }

  async addSection(): Promise<void> {
    const ctxId = this.workContextService.activeWorkContextId;
    const ctxType = this.workContextService.activeWorkContextType;
    if (!ctxId || !ctxType) return;
    const title = await firstValueFrom(
      this._matDialog
        .open(DialogPromptComponent, { data: { placeholder: T.WW.ADD_SECTION_TITLE } })
        .afterClosed(),
    );
    if (typeof title === 'string' && title.trim()) {
      this.sectionService.addSection(title, ctxId, ctxType);
    }
  }

  editSection(id: string, title: string): void {
    this._matDialog
      .open(DialogPromptComponent, {
        data: {
          placeholder: T.WW.ADD_SECTION_TITLE,
          txtValue: title,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((newTitle: string | undefined) => {
        if (newTitle?.trim()) {
          this.sectionService.updateSection(id, { title: newTitle });
        }
      });
  }

  deleteSection(id: string): void {
    this._matDialog
      .open(DialogConfirmComponent, {
        data: {
          message: T.CONFIRM.DELETE_SECTION,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((isConfirm: boolean) => {
        if (isConfirm) {
          this.sectionService.deleteSection(id);
        }
      });
  }

  onTaskAddedToSection(sectionId: string, event: TaskAddEvent): void {
    this.sectionService.addTaskToSection(sectionId, event.taskId, null, null);
  }

  onTaskAddedToDone(event: TaskAddEvent): void {
    this.taskService.setDone(event.taskId);
  }

  async moveDoneToArchive(): Promise<void> {
    const doneTasks = this.doneTasks();
    if (!doneTasks || doneTasks.length === 0) return;

    await this.taskService.moveToArchive(doneTasks);
    this._snackService.open({
      msg: T.F.TASK.S.MOVED_TO_ARCHIVE,
      type: 'SUCCESS',
      ico: 'done_all',
      translateParams: {
        nr: doneTasks.length,
      },
    });
  }
}
