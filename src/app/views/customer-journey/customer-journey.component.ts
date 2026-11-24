import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { Branch, BranchService } from '../../services/branches.service';
import { DishService } from '../../services/dishes.service';
import {
  JourneyFunnel,
  JourneyRange,
  JourneyService,
  JourneySession,
  JourneyTimeline,
} from '../../services/journey.service';
import {
  EVENT_LABELS,
  FAILURE_EVENTS,
  STAGE_BADGES,
  STAGE_LABELS,
  customerLabel,
  describeEvent,
  describeFailure,
  formatMoney,
  formatRelative,
  formatTime,
} from './journey-labels';

const REFRESH_MS = 10_000;

function todayInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Día local completo (00:00 a 00:00 del día siguiente). */
function dayRange(day: string): JourneyRange {
  const [year, month, date] = day.split('-').map(Number);
  const from = new Date(year, month - 1, date);
  const to = new Date(year, month - 1, date + 1);
  return { from, to };
}

@Component({
  selector: 'app-customer-journey',
  imports: [FormsModule],
  templateUrl: './customer-journey.component.html',
})
export class CustomerJourneyComponent implements OnInit {
  readonly #journeyService = inject(JourneyService);
  readonly #branchService = inject(BranchService);
  readonly #dishService = inject(DishService);
  readonly #authService = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly branches = signal<Branch[]>([]);
  readonly sessions = signal<JourneySession[]>([]);
  readonly funnel = signal<JourneyFunnel | null>(null);
  readonly timeline = signal<JourneyTimeline | null>(null);
  readonly selectedSessionId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly lastRefresh = signal<number>(Date.now());

  readonly lastRefreshLabel = computed(() => formatTime(new Date(this.lastRefresh()).toISOString()));

  readonly dishNames = signal(new Map<string, string>());

  branchId = '';
  day = todayInput();

  readonly stageLabels = STAGE_LABELS;
  readonly stageBadges = STAGE_BADGES;
  readonly eventLabels = EVENT_LABELS;
  readonly failureEvents = FAILURE_EVENTS;
  readonly customerLabel = customerLabel;
  readonly describeFailure = describeFailure;
  readonly formatMoney = formatMoney;
  readonly formatTime = formatTime;

  readonly funnelSteps = computed(() => {
    const funnel = this.funnel();

    if (!funnel) {
      return [];
    }

    const base = funnel.qrOpened || funnel.sessions || 1;
    return [
      { label: 'Abrieron el QR', value: funnel.qrOpened },
      { label: 'Se identificaron', value: funnel.identified },
      { label: 'Armaron carrito', value: funnel.withCart },
      { label: 'Enviaron pedido', value: funnel.orderSubmitted },
      { label: 'Pedido creado', value: funnel.orderCreated },
    ].map((step) => ({ ...step, percent: Math.round((step.value / base) * 100) }));
  });

  #inFlight = false;

  ngOnInit(): void {
    this.#loadBranches();

    const timer = window.setInterval(() => this.refresh(true), REFRESH_MS);
    this.#destroyRef.onDestroy(() => window.clearInterval(timer));
  }

  #loadBranches(): void {
    const tenantId = this.#authService.user()?.tenantId;

    this.#branchService.list(tenantId).subscribe({
      next: (branches) => {
        this.branches.set(branches);

        if (!this.branchId && branches.length > 0) {
          this.branchId = branches[0]._id;
          this.onBranchChange();
        }
      },
      error: () => this.error.set('No se pudieron cargar las sucursales.'),
    });
  }

  onBranchChange(): void {
    this.selectedSessionId.set(null);
    this.timeline.set(null);
    this.#loadDishNames();
    this.refresh();
  }

  onDayChange(): void {
    this.selectedSessionId.set(null);
    this.timeline.set(null);
    this.refresh();
  }

  #loadDishNames(): void {
    const branch = this.branches().find((item) => item._id === this.branchId);

    if (!branch) {
      return;
    }

    this.#dishService.list(branch.tenantId).subscribe({
      next: (dishes) => this.dishNames.set(new Map(dishes.map((dish) => [dish._id, dish.name]))),
      error: () => this.dishNames.set(new Map()),
    });
  }

  /** Recarga sesiones, embudo y la sesión abierta. silent: sin indicador de carga. */
  refresh(silent = false): void {
    if (!this.branchId || !this.day || this.#inFlight) {
      return;
    }

    this.#inFlight = true;
    if (!silent) {
      this.loading.set(true);
    }

    const range = dayRange(this.day);

    forkJoin({
      sessions: this.#journeyService.listSessions(this.branchId, range),
      funnel: this.#journeyService.getFunnel(this.branchId, range),
    }).subscribe({
      next: ({ sessions, funnel }) => {
        this.sessions.set(sessions);
        this.funnel.set(funnel);
        this.error.set('');
        this.lastRefresh.set(Date.now());
        this.#inFlight = false;
        this.loading.set(false);

        const selected = this.selectedSessionId();
        if (selected) {
          this.#loadTimeline(selected);
        }
      },
      error: () => {
        this.#inFlight = false;
        this.loading.set(false);
        this.error.set('No se pudieron cargar los eventos de clientes.');
      },
    });
  }

  selectSession(session: JourneySession): void {
    if (this.selectedSessionId() === session.sessionId) {
      this.selectedSessionId.set(null);
      this.timeline.set(null);
      return;
    }

    this.selectedSessionId.set(session.sessionId);
    this.timeline.set(null);
    this.#loadTimeline(session.sessionId);
  }

  #loadTimeline(sessionId: string): void {
    this.#journeyService.getTimeline(this.branchId, sessionId).subscribe({
      next: (timeline) => {
        if (this.selectedSessionId() === sessionId) {
          this.timeline.set(timeline);
        }
      },
      error: () => this.error.set('No se pudo cargar la línea de tiempo.'),
    });
  }

  relative(value: string): string {
    return formatRelative(value, this.lastRefresh());
  }

  eventDetail(event: JourneyTimeline['events'][number]): string {
    return describeEvent(event, this.dishNames());
  }
}
