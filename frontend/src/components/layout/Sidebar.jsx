'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Package,
  PackagePlus, TrendingUp, Receipt, Users, Settings,
  LogOut, Pill, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPERADMIN', 'MANAGER', 'PHARMACIST'] },
  { href: '/sales', label: 'Point of Sale', icon: ShoppingCart, roles: ['SUPERADMIN', 'MANAGER', 'PHARMACIST'] },
  { href: '/sales/history', label: 'Sales History', icon: ClipboardList, roles: ['SUPERADMIN', 'MANAGER', 'PHARMACIST'] },
  { href: '/purchases', label: 'Receive Stock', icon: PackagePlus, roles: ['SUPERADMIN', 'MANAGER', 'PHARMACIST'] },
  { href: '/inventory', label: 'Inventory', icon: Package, roles: ['SUPERADMIN', 'MANAGER', 'PHARMACIST'] },
  { href: '/products', label: 'Products', icon: Pill, roles: ['SUPERADMIN', 'MANAGER'] },
  { href: '/expenses', label: 'Expenses', icon: Receipt, roles: ['SUPERADMIN', 'MANAGER'] },
  { href: '/reports', label: 'Reports', icon: TrendingUp, roles: ['SUPERADMIN', 'MANAGER'] },
  { href: '/users', label: 'Users', icon: Users, roles: ['SUPERADMIN'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['SUPERADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const visibleItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">PharmaCare</p>
            <p className="text-gray-400 text-xs">POS System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
