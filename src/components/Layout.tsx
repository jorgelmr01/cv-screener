import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, MessageSquare, HelpCircle, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { HelpModal } from './HelpModal';

export function Layout() {
    const location = useLocation();
    const { currentSearch } = useAppStore();
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-200`}>
                <div className={`p-4 ${collapsed ? 'px-2' : 'p-6'} flex items-center justify-between`}>
                    {!collapsed && (
                        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <span className="text-2xl">⚡</span> CV Screener
                        </h1>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                        title={collapsed ? 'Expandir' : 'Colapsar'}
                    >
                        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                <nav className="flex-1 px-2 space-y-1">
                    <Link
                        to="/"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.pathname === '/'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={20} />
                        {!collapsed && <span className="font-medium">Dashboard</span>}
                    </Link>

                    {currentSearch && (
                        <div className={collapsed ? '' : 'mt-6'}>
                            {!collapsed && (
                                <div className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                    Búsqueda Activa
                                </div>
                            )}
                            <Link
                                to={`/search/${currentSearch.id}`}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.pathname.startsWith('/search')
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                title={currentSearch.name}
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                                {!collapsed && <span className="font-medium truncate">{currentSearch.name}</span>}
                            </Link>
                            <Link
                                to="/chat"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.pathname === '/chat'
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                title="Chat con IA"
                            >
                                <MessageSquare size={20} />
                                {!collapsed && <span className="font-medium">Chat con IA</span>}
                            </Link>
                        </div>
                    )}
                </nav>

                <div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Ayuda"
                    >
                        <HelpCircle size={20} />
                        {!collapsed && <span className="font-medium">Ayuda</span>}
                    </button>
                    <Link
                        to="/settings"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.pathname === '/settings'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title="Configuración"
                    >
                        <Settings size={20} />
                        {!collapsed && <span className="font-medium">Configuración</span>}
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>

            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    );
}
