import { AppIconName } from '../../icons/icon.component';

export interface NavItem {
  name: string;
  url: string;
  icon: AppIconName;
  roles?: string[];
}

export const navItems: NavItem[] = [
  { name: 'Dashboard', url: '/dashboard', icon: 'dashboard' },
  { name: 'Nuevo pedido', url: '/checkout', icon: 'cart', roles: ['sysadmin', 'admin', 'owner', 'cashier'] },
  { name: 'Pedidos', url: '/orders', icon: 'clipboard', roles: ['sysadmin', 'admin', 'owner', 'cashier'] },
  { name: 'Usuarios', url: '/users', icon: 'users' },
  { name: 'Tenants', url: '/tenants', icon: 'building' },
  { name: 'Sucursales', url: '/branches', icon: 'basket', roles: ['sysadmin', 'admin', 'owner'] },
  { name: 'QR de pedidos', url: '/qr-codes', icon: 'qr', roles: ['sysadmin', 'admin', 'owner'] },
  { name: 'Ingredientes', url: '/ingredients', icon: 'cube', roles: ['sysadmin', 'admin', 'owner'] },
  { name: 'Platos y recetas', url: '/dishes', icon: 'clipboard', roles: ['sysadmin', 'admin', 'owner'] },
  { name: 'Inventario', url: '/inventory', icon: 'storage', roles: ['sysadmin', 'admin', 'owner'] },
  { name: 'Tables', url: '/tables', icon: 'list' },
  { name: 'Typography', url: '/typography', icon: 'pencil' },
  { name: 'Icons', url: '/icons', icon: 'star' }
];
