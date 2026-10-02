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

import { PartyInviteBanner } from './components/PartyInviteBanner';
import { VideoUploadModal } from './components/MobileVideoShareModal';
import { UploadCloud, Film } from 'lucide-react';
import { useParams } from 'react-router-dom';

const PartyRedirectWrapper: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/rooms?join=${code || ''}`} replace />;
};

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
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsWindowDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only deactivate if leaving the window
    if (e.clientX === 0 || e.clientY === 0 || !e.relatedTarget) {
      setIsWindowDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWindowDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setDroppedFile(file);
      setShowUploadModal(true);
    }
  };

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
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen flex flex-col bg-background text-slate-100 relative"
    >
      {/* Full-Screen ImgBB-style Drag and Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-[#004A77]/90 backdrop-blur-lg border-4 border-dashed border-[#A8C7FA] flex flex-col items-center justify-center gap-4 pointer-events-none animate-fade-in">
          <div className="w-24 h-24 rounded-3xl bg-[#A8C7FA] text-[#062E6F] flex items-center justify-center shadow-2xl animate-bounce">
            <UploadCloud className="w-14 h-14 stroke-[2.5]" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Drop movie anywhere to upload
            </h2>
            <p className="text-sm text-[#C2E7FF] font-medium">
              Supports MP4, MKV, MOV, WebM, AVI, 4K UHD & 1080p
            </p>
          </div>
        </div>
      )}

      <Navbar onSearch={setSearchQuery} />
      <PartyInviteBanner />
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
            <Route path="/party/:code" element={<PartyRedirectWrapper />} />
            <Route path="/admin" element={<AdminRouteWrapper />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {showUploadModal && (
        <VideoUploadModal
          initialFile={droppedFile}
          onClose={() => {
            setShowUploadModal(false);
            setDroppedFile(null);
          }}
        />
      )}
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
