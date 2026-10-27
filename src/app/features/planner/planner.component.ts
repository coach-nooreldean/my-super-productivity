import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { DateService } from '../../core/date/date.service';
import { PlannerActions } from './store/planner.actions';
import { selectTaskFeatureState } from '../tasks/store/task.selectors';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { T } from '../../t.const';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { PlannerPlanViewComponent } from './planner-plan-view/planner-plan-view.component';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { PlannerCalendarNavComponent } from './planner-calendar-nav/planner-calendar-nav.component';
import { PlannerService } from './planner.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { selectPlannerDayMap } from './store/planner.selectors';
import { GlobalConfigService } from '../config/global-config.service';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDatepicker, MatDatepickerInput } from '@angular/material/datepicker';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { getDbDateStr } from '../../util/get-db-date-str';

@Component({
  selector: 'planner',
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDropListGroup,
    PlannerPlanViewComponent,
    CdkScrollable,
    PlannerCalendarNavComponent,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatDatepicker,
    MatDatepickerInput,
    MatInput,
    TranslatePipe,
  ],
})
export class PlannerComponent {
  private _store = inject(Store);
  private _dateService = inject(DateService);
  private _plannerService = inject(PlannerService);
  private _globalConfigService = inject(GlobalConfigService);
  layoutService = inject(LayoutService);

  readonly planView = viewChild<PlannerPlanViewComponent>('planViewRef');

  readonly T = T;

  readonly isHideEmptyDays = computed(
    () => !!this._globalConfigService.misc()?.isHideEmptyPlannerDays,
  );

  private _days = toSignal(this._plannerService.days$, { initialValue: [] });
  private _plannerDayMap = toSignal(this._store.select(selectPlannerDayMap), {
    initialValue: {},
  });
  private _prevDaysWithTasksKey = '';
  private _prevDaysWithTasks: ReadonlySet<string> = new Set();
  daysWithTasks = computed<ReadonlySet<string>>(() => {
    const days = this._days();
    const plannerDayMap = this._plannerDayMap();
    const dayDates = new Set(
      Object.entries(plannerDayMap)
        .filter(([, tasks]) => tasks.length > 0)
        .map(([dayDate]) => dayDate),
    );
    for (const day of days) {
      if (day.tasks.length > 0) {
        dayDates.add(day.dayDate);
      }
    }
    const sortedDayDates = [...dayDates].sort();
    const key = sortedDayDates.join(',');
    if (key === this._prevDaysWithTasksKey) {
      return this._prevDaysWithTasks;
    }
    this._prevDaysWithTasksKey = key;
    this._prevDaysWithTasks = new Set(sortedDayDates);
    return this._prevDaysWithTasks;
  });

  constructor() {
    this._store
      .select(selectTaskFeatureState)
      .pipe(takeUntilDestroyed())
      .subscribe((taskState) => {
        this._store.dispatch(
          PlannerActions.cleanupOldAndUndefinedPlannerTasks({
            today: this._dateService.todayStr(),
            allTaskIds: taskState.ids as string[],
          }),
        );
      });
  }

  toggleHideEmptyDays(): void {
    this._globalConfigService.updateSection('misc', {
      isHideEmptyPlannerDays: !this.isHideEmptyDays(),
    });
  }

  onDayPicked(date: Date | null): void {
    if (!date) return;
    const dayDate = getDbDateStr(date);
    this._plannerService.revealDay(dayDate);
    this.planView()?.scrollToDay(dayDate, true);
  }

  onCalendarDayTapped(dayDate: string): void {
    this._plannerService.revealDay(dayDate);
    this.planView()?.scrollToDay(dayDate);
  }
}
