import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import QRCode from 'qrcode';

import { environment } from '../../../environments/environment';
import { Branch, BranchService, PaymentMethod } from '../../services/branches.service';

type DetailTab = 'config' | 'menu' | 'tables' | 'schedules' | 'settings' | 'qr';

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'transfer', label: 'Transferencia' },
];

const TAB_LABELS: Record<DetailTab, string> = {
  config: 'Configuración',
  menu: 'Menú',
  tables: 'Mesas',
  schedules: 'Horarios',
  settings: 'Ajustes',
  qr: 'QR de pedidos',
};

const PLACEHOLDER_TABS: DetailTab[] = ['menu', 'tables', 'schedules', 'settings'];

const ALL_TABS: DetailTab[] = ['config', 'qr', 'menu', 'tables', 'schedules', 'settings'];

@Component({
  selector: 'app-branch-detail',
  imports: [FormsModule, RouterLink, NgClass],
  templateUrl: './branch-detail.component.html'
})
export class BranchDetailComponent implements OnInit {
  readonly #branchService = inject(BranchService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly branch = signal<Branch | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly activeTab = signal<DetailTab>('config');

  readonly tabs: DetailTab[] = ALL_TABS;

  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

  readonly qrUrl = signal('');
  readonly qrDataUrl = signal('');
  readonly qrError = signal('');

  editing: Branch | null = null;

  ngOnInit(): void {
    const id = this.#route.snapshot.paramMap.get('id');

    if (!id) {
      this.#router.navigate(['/branches']);
      return;
    }

    this.#loadBranch(id);
  }

  #loadBranch(id: string): void {
    this.loading.set(true);
    this.error.set('');

    this.#branchService.getById(id).subscribe({
      next: (branch) => {
        this.branch.set(branch);
        this.editing = {
          ...branch,
          paymentMethods: branch.paymentMethods ?? [],
        };
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);

        if (err.status === 403 || err.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set('No se pudo cargar la sucursal.');
        }
      }
    });
  }

  tabLabel(tab: DetailTab): string {
    return TAB_LABELS[tab] ?? tab;
  }

  isPlaceholderTab(tab: DetailTab): boolean {
    return PLACEHOLDER_TABS.includes(tab);
  }

  selectTab(tab: DetailTab): void {
    this.activeTab.set(tab);
    this.error.set('');

    if (tab === 'qr') {
      void this.#loadQr();
    }
  }

  #loadQr(): void {
    const branch = this.branch();

    if (!branch) {
      return;
    }

    const url = `${environment.publicUrl}/q/${branch.tenantId}/${branch._id}`;
    this.qrUrl.set(url);
    this.qrError.set('');

    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then((dataUrl) => this.qrDataUrl.set(dataUrl))
      .catch(() => this.qrError.set('No se pudo generar el código QR.'));
  }

  copyQrUrl(): void {
    const url = this.qrUrl();

    if (!url) {
      return;
    }

    void navigator.clipboard.writeText(url).then(() => {
      this.qrError.set('');
    });
  }

  togglePaymentMethod(method: PaymentMethod): void {
    if (!this.editing) {
      return;
    }

    const methods = this.editing.paymentMethods ?? [];
    const index = methods.indexOf(method);

    if (index >= 0) {
      methods.splice(index, 1);
    } else {
      methods.push(method);
    }

    this.editing.paymentMethods = methods;
  }

  saveEdit(): void {
    if (!this.editing) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { _id, tenantId, name, type, address, city, phone, active } = this.editing;
    const paymentMethods = this.editing.paymentMethods?.length
      ? this.editing.paymentMethods
      : undefined;

    this.#branchService
      .update(_id, {
        tenantId,
        name,
        type,
        address: address || undefined,
        city: city || undefined,
        phone: phone || undefined,
        active,
        paymentMethods,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.branch.set(updated);
          this.editing = { ...updated };
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo guardar la sucursal.');
        }
      });
  }
}
