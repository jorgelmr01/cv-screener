import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAppStore } from './store/useAppStore';
import { ToastContainer } from './components/Toast';
import { FolderPickerModal } from './components/FolderPickerModal';
import { fileSystem } from './services/filesystem';

import { Dashboard } from './pages/Dashboard';
import { SearchView } from './pages/SearchView';
import { ChatView } from './pages/ChatView';
import { SettingsPage } from './pages/SettingsPage';

function App() {
    const { init, settings } = useAppStore();
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const startup = async () => {
            await init();
            setInitialized(true);

            if (fileSystem.isSupported()) {
                const restored = await fileSystem.restoreHandle();
                if (!restored && !localStorage.getItem('cv-screener-folder-skipped')) {
                    setShowFolderPicker(true);
                }
            }
        };
        startup();
    }, [init]);

    useEffect(() => {
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.theme]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Handled by individual modals
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!initialized) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando CV Screener...</p>
                </div>
            </div>
        );
    }

    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="search/:id" element={<SearchView />} />
                    <Route path="chat" element={<ChatView />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
            <ToastContainer />
            <FolderPickerModal
                isOpen={showFolderPicker}
                onClose={() => setShowFolderPicker(false)}
                onFolderSelected={async () => {
                    await fileSystem.syncAll();
                }}
            />
        </HashRouter>
    );
}

export default App;
