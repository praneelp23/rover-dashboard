import React from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

interface MainLayoutProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isConnected: boolean;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  currentPage, 
  setCurrentPage, 
  isConnected,
  children 
}) => {
  const pageTitles: Record<string, string> = {
    'dashboard': 'Command Center',
    'radar': 'Radar System',
    'control': 'Rover Control',
    'settings': 'System Settings'
  };

  return (
    <div className="flex h-screen bg-industrial-900 overflow-hidden selection:bg-neon-blue/30 selection:text-neon-blue">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-neon-purple/5 rounded-full blur-[100px]" />
      </div>

      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <TopNavbar 
          pageTitle={pageTitles[currentPage] || 'Dashboard'} 
          isConnected={isConnected} 
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
