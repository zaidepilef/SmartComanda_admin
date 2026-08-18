import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Tenant, TenantService } from '../../services/tenants.service';

interface TenantForm {
  name: string;
  rut: string;
  razonSocial: string;
  active: boolean;
}

interface LoyaltyEdit {
  tenant: Tenant;
  pointsPerAmount: string;
  currency: string;
}

const EMPTY_FORM: TenantForm = {
  name: '',
  rut: '',
  razonSocial: '',
  active: true,
};

@Component({
  selector: 'app-tenants',
  imports: [FormsModule],
  templateUrl: './tenants.component.html'
})

export class TenantsComponent implements OnInit {
  readonly #tenantService = inject(TenantService);
  readonly #router = inject(Router);

  readonly tenants = signal<Tenant[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly creating = signal(false);

  editing: Tenant | null = null;
  newTenant: TenantForm = { ...EMPTY_FORM };
  loyaltyEdit: LoyaltyEdit | null = null;

  ngOnInit(): void {
    this.#load();
  }

  #load(): void {
    this.loading.set(true);
    this.error.set('');

    this.#tenantService.list().subscribe({
      next: (tenants) => {
        this.tenants.set(tenants);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los tenants.');
      }
    });
  }

  startCreate(): void {
    this.newTenant = { ...EMPTY_FORM };
    this.creating.set(true);
    this.error.set('');
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  saveCreate(): void {
    this.saving.set(true);
    this.error.set('');

    const { name, rut, razonSocial, active } = this.newTenant;

    this.#tenantService
      .create({
        name,
        rut: rut || undefined,
        razonSocial: razonSocial || undefined,
        active,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.creating.set(false);
          this.#load();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo crear el tenant.');
        }
      });
  }

  startEdit(tenant: Tenant): void {
    this.editing = { ...tenant };
  }

  startLoyaltyEdit(tenant: Tenant): void {
    this.loyaltyEdit = {
      tenant: { ...tenant },
      pointsPerAmount: String(tenant.loyalty?.pointsPerAmount ?? ''),
      currency: tenant.loyalty?.currency ?? 'CLP',
    };
  }

  cancelLoyaltyEdit(): void {
    this.loyaltyEdit = null;
  }

  currentLoyaltyLabel(): string {
    const points = this.loyaltyEdit?.tenant.loyalty?.pointsPerAmount;
    return points ? `regla actual: $${points}` : 'sin regla configurada';
  }

  saveLoyaltyEdit(): void {
    if (!this.loyaltyEdit) {
      return;
    }

    const points = Number(this.loyaltyEdit.pointsPerAmount);

    if (!Number.isInteger(points) || points <= 0) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    this.#tenantService
      .update(this.loyaltyEdit.tenant._id, {
        loyalty: {
          pointsPerAmount: points,
          currency: this.loyaltyEdit.currency || 'CLP',
        },
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.loyaltyEdit = null;
          this.#load();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo guardar la regla de puntos.');
        }
      });
  }

  disableLoyalty(): void {
    if (!this.loyaltyEdit) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    this.#tenantService
      .update(this.loyaltyEdit.tenant._id, { loyalty: null })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.loyaltyEdit = null;
          this.#load();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo desactivar la regla de puntos.');
        }
      });
  }

  openBranches(tenant: Tenant): void {
    void this.#router.navigate(['/branches'], { queryParams: { tenantId: tenant._id } });
  }

  cancelEdit(): void {
    this.editing = null;
  }

  saveEdit(): void {
    if (!this.editing) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { _id, name, rut, razonSocial, active } = this.editing;

    this.#tenantService
      .update(_id, {
        name,
        rut: rut || undefined,
        razonSocial: razonSocial || undefined,
        active,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.editing = null;
          this.#load();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo guardar el tenant.');
        }
      });
  }
}
