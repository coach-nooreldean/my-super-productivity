import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { WorkContextService } from '../work-context/work-context.service';
import { WorkContextType } from '../work-context/work-context.model';
import { toSignal } from '@angular/core/rxjs-interop';

export type ProjectViewMode = 'LIST' | 'KANBAN';

export const LS_PROJECT_VIEW_MODE_PREFIX = 'SUP_PROJECT_VIEW_MODE_';

@Injectable({
  providedIn: 'root',
})
export class ProjectViewModeService {
  private _workContextService = inject(WorkContextService);

  private _activeWorkContextTypeAndId = toSignal(
    this._workContextService.activeWorkContextTypeAndId$,
  );

  readonly isProject = computed(
    () => this._activeWorkContextTypeAndId()?.activeType === WorkContextType.PROJECT,
  );

  readonly projectId = computed(() =>
    this.isProject() ? this._activeWorkContextTypeAndId()?.activeId : null,
  );

  readonly currentViewMode = signal<ProjectViewMode>('LIST');

  readonly isKanbanView = computed(
    () => this.isProject() && this.currentViewMode() === 'KANBAN',
  );

  constructor() {
    effect(
      () => {
        const pId = this.projectId();
        if (pId) {
          const stored = localStorage.getItem(`${LS_PROJECT_VIEW_MODE_PREFIX}${pId}`);
          this.currentViewMode.set(stored === 'KANBAN' ? 'KANBAN' : 'LIST');
        } else {
          this.currentViewMode.set('LIST');
        }
      },
      { allowSignalWrites: true },
    );
  }

  setViewMode(mode: ProjectViewMode): void {
    const pId = this.projectId();
    this.currentViewMode.set(mode);
    if (pId) {
      localStorage.setItem(`${LS_PROJECT_VIEW_MODE_PREFIX}${pId}`, mode);
    }
  }

  toggleViewMode(): void {
    const next = this.currentViewMode() === 'KANBAN' ? 'LIST' : 'KANBAN';
    this.setViewMode(next);
  }
}
