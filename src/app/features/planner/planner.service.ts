import { effect, inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import {
  first,
  map,
  shareReplay,
  switchMap,
  tap,
  distinctUntilChanged,
} from 'rxjs/operators';
import { selectAllTasksWithDueTime } from '../tasks/store/task.selectors';
import { Store } from '@ngrx/store';
import { CalendarIntegrationService } from '../calendar-integration/calendar-integration.service';
import { PlannerDay } from './planner.model';
import { selectPlannerDays } from './store/planner.selectors';
import { TaskWithDueTime } from '../tasks/task.model';
import { DateService } from '../../core/date/date.service';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { selectTodayTaskIds } from '../work-context/store/work-context.selectors';
import { msToString } from '../../ui/duration/ms-to-string.pipe';
import { getDbDateStr } from '../../util/get-db-date-str';
import { parseDbDateStr } from '../../util/parse-db-date-str';
import { getDiffInDays } from '../../util/get-diff-in-days';
import { selectActiveTaskRepeatCfgs } from '../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { Log } from '../../core/log';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { buildDayWindow } from './util/build-day-window';
import { GlobalConfigService } from '../config/global-config.service';

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  private static readonly INITIAL_DAYS_DESKTOP = 15;
  private static readonly INITIAL_DAYS_MOBILE = 5;
  private static readonly AUTO_LOAD_INCREMENT = 7;

  private _store = inject(Store);
  private _calendarIntegrationService = inject(CalendarIntegrationService);
  private _dateService = inject(DateService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _layoutService = inject(LayoutService);
  private _globalConfigService = inject(GlobalConfigService);

  private _userHasScrolled = signal(false);
  private _revealedDays$ = new BehaviorSubject<ReadonlySet<string>>(new Set());

  isHideEmptyDays$ = this._globalConfigService.misc$.pipe(
    map((misc) => !!misc?.isHideEmptyPlannerDays),
    distinctUntilChanged(),
  );

  private _daysToShowCount$ = new BehaviorSubject<number>(
    this._layoutService.isXs()
      ? PlannerService.INITIAL_DAYS_MOBILE
      : PlannerService.INITIAL_DAYS_DESKTOP,
  );
  public isLoadingMore$ = new BehaviorSubject<boolean>(false);
  private _loadMoreTimeoutId: ReturnType<typeof setTimeout> | null = null;

  includedWeekDays$ = of([0, 1, 2, 3, 4, 5, 6]);

  constructor() {
    // Reset to initial count when breakpoint changes, but only if user hasn't scrolled yet
    effect(() => {
      const isMobile = this._layoutService.isXs();

      // Only reset to initial count if user hasn't manually scrolled yet
      if (!this._userHasScrolled()) {
        const newCount = isMobile
          ? PlannerService.INITIAL_DAYS_MOBILE
          : PlannerService.INITIAL_DAYS_DESKTOP;
        this._daysToShowCount$.next(newCount);
      }
    });
  }

  daysToShow$ = combineLatest([
    this._daysToShowCount$,
    this._globalTrackingIntervalService.todayDateStr$,
    this.includedWeekDays$,
  ]).pipe(
    // eslint-disable-next-line local-rules/no-user-content-in-logs -- grandfathered log baseline (2026-09), not yet triaged
    tap(([count, todayStr]) => Log.log('daysToShow$', { count, todayStr })),
    map(([count, _, includedWeekDays]) =>
      buildDayWindow(
        // Anchor on the logical day, not the raw clock: between calendar
        // midnight and the configured start-of-next-day the window must still
        // begin at (logical) today, or the tasks planned for it have no
        // rendered day at all; ensureDayLoaded below can only extend the
        // window forward.
        this._dateService.getLogicalTodayDate(),
        count,
        includedWeekDays,
        (d) => this._dateService.todayStr(d),
      ),
    ),
  );

  allDueWithTimeTasks$: Observable<TaskWithDueTime[]> = this._store.select(
    selectAllTasksWithDueTime,
  );

  // TODO this needs to be more performant
  private _selectPlannerDaysFor$(
    dayDates$: Observable<string[]>,
  ): Observable<PlannerDay[]> {
    return dayDates$.pipe(
      switchMap((daysToShow) =>
        combineLatest([
          this._store.select(selectActiveTaskRepeatCfgs),
          this._store.select(selectTodayTaskIds),
          this._calendarIntegrationService.calendarEvents$,
          this.allDueWithTimeTasks$,
          this._globalTrackingIntervalService.todayDateStr$,
        ]).pipe(
          switchMap(
            ([
              taskRepeatCfgs,
              todayListTaskIds,
              calendarEvents,
              allTasksPlanned,
              todayStr,
            ]) =>
              this._store.select(
                selectPlannerDays(
                  daysToShow,
                  taskRepeatCfgs,
                  todayListTaskIds,
                  calendarEvents,
                  allTasksPlanned,
                  todayStr,
                ),
              ),
          ),
        ),
      ),
    );
  }

  revealDay(dayDate: string): void {
    this.ensureDayLoaded(dayDate);
    const set = new Set(this._revealedDays$.value);
    set.add(dayDate);
    this._revealedDays$.next(set);
  }

  allDays$: Observable<PlannerDay[]> = this._selectPlannerDaysFor$(this.daysToShow$).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private _isDayActive(day: PlannerDay): boolean {
    return (
      day.tasks.length > 0 ||
      day.scheduledIItems.length > 0 ||
      day.deadlineTasks.length > 0 ||
      day.noStartTimeRepeatProjections.length > 0 ||
      day.allDayEvents.length > 0
    );
  }

  days$: Observable<PlannerDay[]> = combineLatest([
    this.allDays$,
    this.isHideEmptyDays$,
    this._revealedDays$,
  ]).pipe(
    map(([days, isHideEmpty, revealedDays]) => {
      const filtered = !isHideEmpty
        ? days
        : days.filter(
            (day) =>
              day.isToday || this._isDayActive(day) || revealedDays.has(day.dayDate),
          );
      return { filtered, isHideEmpty };
    }),
    tap(({ filtered, isHideEmpty }) => {
      if (
        isHideEmpty &&
        filtered.length < 5 &&
        this._daysToShowCount$.value < 60 &&
        !this.isLoadingMore$.value
      ) {
        this.loadMoreDays();
      }
    }),
    map(({ filtered }) => filtered),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  tomorrow$ = this.allDays$.pipe(
    map((days) => {
      const tomorrowStr = getDbDateStr(this._dateService.getLogicalTomorrowMs());
      return days.find((d) => d.dayDate === tomorrowStr) ?? null;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  // plannedTaskDayMap$: Observable<{ [taskId: string]: string }> = this._store
  //   .select(selectTaskIdPlannedDayMap)
  //   // make this more performant by sharing stream
  //   .pipe(shareReplay(1));

  getDayOnce$(dayStr: string): Observable<PlannerDay | undefined> {
    return this._selectPlannerDaysFor$(of([dayStr])).pipe(
      map((days) => days.find((d) => d.dayDate === dayStr)),
      first(),
    );
  }

  getSnackExtraStr(dayStr: string): Promise<string> {
    return this.getDayOnce$(dayStr)
      .pipe(
        map((day) => {
          if (!day) {
            return '';
          }
          if (day.timeEstimate === 0) {
            return ` – ∑ ${day.itemsTotal}`;
          }

          return `<br />∑ ${day.itemsTotal} ｜ ${msToString(day.timeEstimate)}`;
        }),
      )
      .toPromise();
  }

  loadMoreDays(): void {
    this.isLoadingMore$.next(true);
    this._userHasScrolled.set(true);

    // Yield to event loop to ensure loading state is visible
    this._loadMoreTimeoutId = setTimeout(() => {
      this._loadMoreTimeoutId = null;
      const currentCount = this._daysToShowCount$.value;
      this._daysToShowCount$.next(currentCount + PlannerService.AUTO_LOAD_INCREMENT);
      this.isLoadingMore$.next(false);
    }, 0);
  }

  ensureDayLoaded(dayDate: string): void {
    const target = parseDbDateStr(dayDate);
    const diff = getDiffInDays(this._dateService.getLogicalTodayDate(), target);
    if (diff >= 0 && diff >= this._daysToShowCount$.value) {
      this._userHasScrolled.set(true);
      this._daysToShowCount$.next(diff + 3);
    }
  }

  resetScrollState(): void {
    if (this._loadMoreTimeoutId !== null) {
      clearTimeout(this._loadMoreTimeoutId);
      this._loadMoreTimeoutId = null;
    }
    this.isLoadingMore$.next(false);
    this._userHasScrolled.set(false);
    this._revealedDays$.next(new Set());
    this._daysToShowCount$.next(
      this._layoutService.isXs()
        ? PlannerService.INITIAL_DAYS_MOBILE
        : PlannerService.INITIAL_DAYS_DESKTOP,
    );
  }
}
