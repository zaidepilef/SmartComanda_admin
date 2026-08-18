import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CREATABLE_ROLES, User, UserRole, UserService, UserStatus } from './user.service';
import { Tenant, TenantService } from '../../services/tenants.service';
import { Branch, BranchService } from '../../services/branches.service';

const STATUS_LABELS: Record<UserStatus, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  inactive: 'Inactivo',
};

const STATUS_BADGES: Record<UserStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
};

const ROLE_LABELS: Record<UserRole, string> = {
  sysadmin: 'Sysadmin',
  owner: 'Owner',
  admin: 'Admin',
  cashier: 'Cajero',
};

const ROLE_BADGES: Record<UserRole, string> = {
  sysadmin: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
  owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  admin: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  cashier: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
};

interface NewUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status: UserStatus;
  //role: Exclude<UserRole, 'sysadmin'>;
  role:UserRole;
  tenantId: string;
  branchId: string;
}

const EMPTY_NEW_USER: NewUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  status: 'active',
  role: 'owner',
  tenantId: '',
  branchId: '',
};

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  templateUrl: './users.component.html'
})
export class UsersComponent  implements OnInit {
  readonly #userService = inject(UserService);
  readonly #tenantService = inject(TenantService);
  readonly #branchService = inject(BranchService);

  readonly users = signal<User[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly creating = signal(false);

  statusFilter = '';
  page = 1;
  limit = 10;
  editing: User | null = null;
  newUser: NewUserForm = { ...EMPTY_NEW_USER };
  tenants: Tenant[] = [];
  branches: Branch[] = [];
  creatableRoles = CREATABLE_ROLES;

  ngOnInit(): void {
    this.#load();
    this.#loadTenants();
    this.#loadBranches();
  }

  #loadBranches(tenantId?: string): void {
    this.#branchService.list(tenantId).subscribe({
      next: (branches) => {
        this.branches = branches;
      }
    });
  }

  #load(): void {
    this.loading.set(true);
    this.error.set('');

    this.#userService
      .list({ page: this.page, limit: this.limit, status: this.statusFilter })
      .subscribe({
        next: (response) => {
          this.users.set(response.data);
          this.total.set(response.pagination.total);
          this.totalPages.set(response.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar los usuarios.');
        }
      });
  }

  label(status: UserStatus): string {
    return STATUS_LABELS[status];
  }

  badge(status: UserStatus): string {
    return STATUS_BADGES[status];
  }

  roleLabel(role: UserRole | undefined): string {
    return role ? ROLE_LABELS[role] : '—';
  }

  roleBadge(role: UserRole | undefined): string {
    return role ? ROLE_BADGES[role] : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  }

  #loadTenants(): void {
    this.#tenantService.list().subscribe({
      next: (tenants) => {
        this.tenants = tenants;
      }
    });
  }

  applyFilter(): void {
    this.page = 1;
    this.#load();
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.#load();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages()) {
      this.page += 1;
      this.#load();
    }
  }

  approve(user: User): void {
    this.#setStatus(user, 'active');
  }

  reject(user: User): void {
    this.#setStatus(user, 'inactive');
  }

  #setStatus(user: User, status: UserStatus): void {
    this.error.set('');

    this.#userService.update(user._id, { status }).subscribe({
      next: () => this.#load(),
      error: (err) => {
        this.error.set(err.error?.error ?? 'No se pudo actualizar el usuario.');
      }
    });
  }

  startEdit(user: User): void {
    this.editing = { ...user };
    this.#loadBranches(user.tenantId || undefined);
  }

  cancelEdit(): void {
    this.editing = null;
  }

  startCreate(): void {
    this.newUser = { ...EMPTY_NEW_USER };
    this.creating.set(true);
    this.error.set('');
    this.#loadBranches();
  }

  onNewTenantChange(): void {
    this.newUser.branchId = '';
    this.#loadBranches(this.newUser.tenantId || undefined);
  }

  onEditTenantChange(): void {
    if (this.editing) {
      this.editing.branchId = '';
      this.#loadBranches(this.editing.tenantId || undefined);
    }
  }

  cancelCreate(): void {
    this.creating.set(false);
  }

  saveCreate(): void {
    this.saving.set(true);
    this.error.set('');

    const { firstName, lastName, email, password, status, role, tenantId, branchId } = this.newUser;

    this.#userService
      .create({
        firstName,
        lastName,
        email,
        password,
        status,
        role,
        tenantId: tenantId || undefined,
        branchId: role === 'cashier' ? branchId || undefined : undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.creating.set(false);
          this.#load();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error ?? 'No se pudo crear el usuario.');
        }
      });
  }

  saveEdit(): void {
    if (!this.editing) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const { _id, firstName, lastName, email, status, role, tenantId, branchId } = this.editing;

    const payload = { firstName, lastName, email, status };

    if (role) {
      (payload as { role?: UserRole }).role = role;
    }

    if (tenantId) {
      (payload as { tenantId?: string }).tenantId = tenantId;
    }

    if (role === 'cashier') {
      (payload as { branchId?: string }).branchId = branchId || undefined;
    }

    this.#userService.update(_id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing = null;
        this.#load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.error ?? 'No se pudo guardar el usuario.');
      }
    });
  }
}
