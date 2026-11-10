import React from 'react';
import { LayoutDashboard, Gift, Sliders, Shield } from 'lucide-react';

interface NavProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

export const NavigationBar: React.FC<NavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'sorteos', label: 'Sorteos', icon: Gift },
    { id: 'pesos', label: 'Probabilidades', icon: Sliders },
    { id: 'moderacion', label: 'Moderación', icon: Shield },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322]/95 backdrop-blur-lg border-t border-gray-800/80 px-2 py-1.5 safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition duration-200 ${
                isActive
                  ? 'text-violet-400 bg-violet-500/10 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition ${isActive ? 'scale-110 text-violet-400 stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
