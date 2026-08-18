import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';

const managerRoles = ['sysadmin', 'admin', 'owner'];

const checkoutRoles = ['sysadmin', 'admin', 'owner', 'cashier'];

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login.component').then((m) => m.LoginComponent),
    data: {
      title: 'Login'
    }
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/pages/register/register.component').then((m) => m.RegisterComponent),
    data: {
      title: 'Register'
    }
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () => import('./layout').then((m) => m.DefaultLayoutComponent),
    canActivate: [authGuard],
    data: {
      title: 'Home'
    },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./views/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: {
          title: 'Dashboard'
        }
      },
      {
        path: 'users',
        loadComponent: () => import('./views/users/users.component').then((m) => m.UsersComponent),
        data: {
          title: 'Usuarios'
        }
      },
      {
        path: 'tenants',
        loadComponent: () => import('./views/tenants/tenants.component').then((m) => m.TenantsComponent),
        data: {
          title: 'Tenants'
        }
      },
      {
        path: 'branches',
        loadComponent: () => import('./views/branches/branches.component').then((m) => m.BranchesComponent),
        canActivate: [authGuard, roleGuard(managerRoles)],
        data: {
          title: 'Sucursales'
        }
      },
      {
        path: 'branches/:id',
        loadComponent: () => import('./views/branch-detail/branch-detail.component').then((m) => m.BranchDetailComponent),
        canActivate: [authGuard, roleGuard(managerRoles)],
        data: {
          title: 'Detalle de sucursal'
        }
      },
      {
        path: 'qr-codes',
        loadComponent: () => import('./views/qr-codes/qr-codes.component').then((m) => m.QrCodesComponent),
        canActivate: [authGuard, roleGuard(managerRoles)],
        data: {
          title: 'QR de pedidos'
        }
      },
      {
        path: 'ingredients',
        loadComponent: () => import('./views/ingredients/ingredients.component').then((m) => m.IngredientsComponent),
        canActivate: [authGuard, roleGuard(managerRoles)],
        data: {
          title: 'Ingredientes'
        }
      },
      {
        path: 'dishes',
        loadComponent: () => import('./views/dishes/dishes.component').then((m) => m.DishesComponent),
        canActivate: [authGuard, roleGuard(managerRoles)],
        data: {
          title: 'Platos y recetas'
        }
      },
      {
        path: 'inventory',
        loadComponent: () => import('./views/inventory/inventory.component').then((m) => m.InventoryComponent),
        canActivate: [authGuard, roleGuard(managerRoles)],
        data: {
          title: 'Inventario'
        }
      },
      {
        path: 'checkout',
        loadComponent: () => import('./views/checkout/checkout.component').then((m) => m.CheckoutComponent),
        canActivate: [authGuard, roleGuard(checkoutRoles)],
        data: {
          title: 'Nuevo pedido'
        }
      },
      {
        path: 'orders',
        loadComponent: () => import('./views/orders/orders.component').then((m) => m.OrdersComponent),
        canActivate: [authGuard, roleGuard(checkoutRoles)],
        data: {
          title: 'Pedidos'
        }
      },
      {
        path: 'tables',
        loadComponent: () => import('./views/tables/tables.component').then((m) => m.TablesComponent),
        data: {
          title: 'Tables'
        }
      },
      {
        path: 'typography',
        loadComponent: () => import('./views/typography/typography.component').then((m) => m.TypographyComponent),
        data: {
          title: 'Typography'
        }
      },
      {
        path: 'icons',
        loadComponent: () => import('./views/icons/icons.component').then((m) => m.IconsComponent),
        data: {
          title: 'Icons'
        }
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
