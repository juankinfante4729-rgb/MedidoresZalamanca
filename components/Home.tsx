import React, { useMemo } from 'react';
import { House, TOTAL_HOUSES } from '../types';
import { HOME_HERO_IMAGE } from '../constants';

interface HomeProps {
  houses: House[];
  onNavigate: (view: 'registry') => void;
}

export const Home: React.FC<HomeProps> = ({ houses, onNavigate }) => {
  // Filter out Constructora houses for stats
  const activeHouses = houses.filter(h => !h.isConstructora);
  const activeTotal = activeHouses.length;

  const completedCount = activeHouses.filter(h => h.progress === 100).length;
  // Prevent division by zero if all houses are constructora (unlikely but safe)
  const progressPercent = activeTotal > 0 ? Math.round((completedCount / activeTotal) * 100) : 0;
  
  const constructoraCount = houses.length - activeTotal;

  // Generate Recent Activity Feed from Real Data (Include all houses or just active? Usually all activity is relevant, but let's stick to active for consistency if requested "toda la aplicación")
  // However, usually activity feeds show system activity. I will leave filtered to be consistent with "indicators".
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      title: string;
      subtitle: string;
      time: string;
      rawDate: string;
      icon: string;
      colorClass: string;
      iconColorClass: string;
    }> = [];

    const today = new Date().toISOString().split('T')[0];

    // Only scan active houses for the feed
    activeHouses.forEach((h) => {
      // 1. Documents Activity
      h.documents.forEach((d) => {
        if (d.isSubmitted && d.submissionDate) {
           const isToday = d.submissionDate === today;
           const dateObj = new Date(d.submissionDate + 'T12:00:00'); 
           const displayTime = isToday ? 'Hoy' : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

           activities.push({
             id: `doc-${h.id}-${d.id}`,
             title: `Unidad ${h.houseNumber} - ${d.name}`,
             subtitle: 'Documento cargado',
             time: displayTime,
             rawDate: d.submissionDate,
             icon: 'upload_file',
             colorClass: 'bg-blue-100',
             iconColorClass: 'text-blue-600'
           });
        }
      });

      // 2. Completion Activity
      if (h.progress === 100) {
        const dates = h.documents.map(d => d.submissionDate).filter(Boolean) as string[];
        if (dates.length > 0) {
            dates.sort();
            const lastDate = dates[dates.length - 1];
            const isToday = lastDate === today;
            const dateObj = new Date(lastDate + 'T12:00:00');
            const displayTime = isToday ? 'Hoy' : dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

            activities.push({
                id: `comp-${h.id}`,
                title: `Unidad ${h.houseNumber} - Completada`,
                subtitle: 'Todos los requisitos listos',
                time: displayTime,
                rawDate: lastDate,
                icon: 'check_circle',
                colorClass: 'bg-emerald-100',
                iconColorClass: 'text-emerald-600'
            });
        }
      }
    });

    return activities.sort((a, b) => {
        if (a.rawDate > b.rawDate) return -1;
        if (a.rawDate < b.rawDate) return 1;
        if (a.id.startsWith('comp')) return -1;
        if (b.id.startsWith('comp')) return 1;
        return 0;
    }).slice(0, 5);
  }, [activeHouses]);

  return (
    <div className="p-4 md:p-0 space-y-4 md:space-y-6 animate-in fade-in duration-500">
      
      {/* Hero Section */}
      <div className="relative h-56 md:h-72 w-full overflow-hidden rounded-xl bg-gray-200 shadow-lg group">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" 
          style={{ 
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.8) 100%), url('${HOME_HERO_IMAGE}')`
          }}
        ></div>
        <div className="absolute bottom-0 left-0 p-5 md:p-8 w-full max-w-3xl">
          <span className="inline-block px-2 py-1 mb-2 rounded bg-primary text-white text-[10px] md:text-xs font-bold uppercase tracking-wider">Proyecto Activo</span>
          <h2 className="text-white text-2xl md:text-4xl font-bold leading-tight">Proyecto Medidores Individuales</h2>
          <p className="text-white/80 text-xs md:text-base font-medium mt-1">Gestión y Documentación Hidráulica - Conjunto Alcázar de Salamanca</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:col-span-2">
          <div className="flex flex-col gap-2 rounded-xl p-4 md:p-6 bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-xl">home</span>
              <p className="text-gray-500 text-xs font-medium uppercase">Casas (Objetivo)</p>
            </div>
            <div className="flex items-baseline gap-2">
                <p className="text-[#111418] text-2xl md:text-3xl font-bold leading-tight">{activeTotal}</p>
                {constructoraCount > 0 && (
                    <span className="text-xs text-gray-400 font-medium" title="Casas pertenecientes a constructora excluidas">({constructoraCount} excluidas)</span>
                )}
            </div>
            <div className="h-1 w-full bg-gray-100 rounded-full mt-1">
              <div className="h-1 bg-primary rounded-full w-full"></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-4 md:p-6 bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 text-green-500">
              <span className="material-symbols-outlined text-xl">verified</span>
              <p className="text-gray-500 text-xs font-medium uppercase">Completadas</p>
            </div>
            <p className="text-[#111418] text-2xl md:text-3xl font-bold leading-tight">{completedCount}</p>
            <div className="h-1 w-full bg-gray-100 rounded-full mt-1">
              <div className="h-1 bg-green-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
          
          {/* Main Progress Card */}
          <div className="col-span-2 bg-white p-5 md:p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[#111418] font-bold md:text-lg">Progreso General</h3>
                <p className="text-gray-500 text-sm">{completedCount} de {activeTotal} unidades listas</p>
              </div>
              <div className="flex items-center justify-center size-14 md:size-16 rounded-full border-4 border-primary/20 border-t-primary transform rotate-[45deg]">
                 <span className="text-primary font-bold text-sm md:text-base -rotate-[45deg]">{progressPercent}%</span>
              </div>
            </div>
            <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between mt-3 text-[11px] md:text-xs text-gray-400 font-medium uppercase tracking-wider">
              <span>Inicio: 02 Feb</span>
              <span>Meta: 28 Feb</span>
            </div>
          </div>
        </div>

        {/* Action & Activity Column */}
        <div className="space-y-4 md:space-y-6 flex flex-col h-full">
          <button 
            onClick={() => onNavigate('registry')}
            className="group w-full flex items-center justify-center gap-3 bg-primary text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all hover:bg-primary/90"
          >
            <span className="material-symbols-outlined">assignment_add</span>
            <span>Ir al Registro</span>
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
          </button>

          <div className="flex-1 bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-[#111418] font-bold mb-4 px-1 border-b border-gray-50 pb-2">Actividad Reciente</h3>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-lg hover:bg-gray-50 transition-colors animate-in slide-in-from-right-2 duration-300">
                    <div className={`size-10 rounded-lg flex items-center justify-center ${item.colorClass} ${item.iconColorClass}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.subtitle}</p>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">{item.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                   <span className="material-symbols-outlined text-3xl mb-2 opacity-50">history</span>
                   <p className="text-sm">Sin actividad reciente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};