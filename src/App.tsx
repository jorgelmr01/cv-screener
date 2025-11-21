import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAppStore } from './store/useAppStore';

import { Dashboard } from './pages/Dashboard';
import { SearchView } from './pages/SearchView';
import { ChatView } from './pages/ChatView';
import { SettingsPage } from './pages/SettingsPage';

function App() {
    const { init, settings } = useAppStore();

    useEffect(() => {
        init();
    }, [init]);

    useEffect(() => {
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.theme]);

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
        </HashRouter>
    );
}

export default App;
