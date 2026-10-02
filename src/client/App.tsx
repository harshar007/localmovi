import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SetupWizard } from './components/SetupWizard';

// Pages
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { WatchPage } from './pages/WatchPage';
import { RemotePage } from './pages/RemotePage';
import { RoomsPage } from './pages/RoomsPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

const AdminRouteWrapper: React.FC = () => {
  const { isSetupCompleted, refreshStatus } = useAuth();
  if (!isSetupCompleted) {
    return <SetupWizard onCompleted={() => refreshStatus()} />;
  }
  return <AdminPage />;
};

const AppContent: React.FC = () => {
  const { isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-primary" />
          <span className="text-xs font-semibold text-slate-400 font-mono">
            Loading LocalStream...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100">
      <Navbar onSearch={setSearchQuery} />
      <div className="flex flex-1 relative">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            {/* Direct video play route - zero login required */}
            <Route path="/watch/:id" element={<WatchPage />} />
            <Route path="/remote" element={<RemotePage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/admin" element={<AdminRouteWrapper />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
export default App;
