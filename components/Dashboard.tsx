import React, { useMemo, useState } from 'react';
import { House, REQUIRED_DOCS } from '../types';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  houses: House[];
  onNavigate?: (view: 'registry') => void;
  onSelectHouse?: (houseId: number) => void;
}
const getHouseSubmittedCount = (h: House) => {
  const hasLien = h.documents.find(d => d.id === 'lien')?.isSubmitted;
  const hasCatastral = h.documents.find(d => d.id === 'catastral')?.isSubmitted;
  const sharedCount = (hasLien || hasCatastral) ? 1 : 0;
  const otherCount = h.documents.filter(d => d.isSubmitted && d.id !== 'lien' && d.id !== 'catastral').length;
  return otherCount + sharedCount;
};

export const Dashboard: React.FC<DashboardProps> = ({ houses, onNavigate, onSelectHouse }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'incomplete' | 'pending'>('all');

  // EXCLUSION LOGIC: Filter out 'Constructora' houses from all indicators
  const activeHouses = houses.filter(h => !h.isConstructora);
  const totalActiveHouses = activeHouses.length;

  const completedCount = activeHouses.filter(h => h.progress === 100).length;
  const pendingDocsCount = activeHouses.reduce((acc, h) => acc + h.documents.filter(d => !d.isSubmitted).length, 0);
  const completionRate = totalActiveHouses > 0 ? Math.round((completedCount / totalActiveHouses) * 100) : 0;

  // Counts for Heatmap Legend
  const countCompleted = activeHouses.filter(h => h.progress === 100).length;
  const countIncomplete = activeHouses.filter(h => h.progress > 0 && h.progress < 100).length;
  const countPending = activeHouses.filter(h => h.progress === 0).length;

  // Filter Logic for Heatmap
  const filteredHeatmapHouses = activeHouses.filter(h => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return h.progress === 100;
    if (filterStatus === 'incomplete') return h.progress > 0 && h.progress < 100;
    if (filterStatus === 'pending') return h.progress === 0;
    return true;
  });

  const toggleFilter = (status: 'completed' | 'incomplete' | 'pending') => {
    if (filterStatus === status) {
      setFilterStatus('all');
    } else {
      setFilterStatus(status);
    }
  };

  // New KPI: Global Document Progress
  const totalRequiredDocs = totalActiveHouses * (REQUIRED_DOCS.length - 1); // Shared slot logic
  const totalSubmittedDocs = activeHouses.reduce((acc, h) => acc + getHouseSubmittedCount(h), 0);
  const globalDocProgress = totalRequiredDocs > 0 ? Math.round((totalSubmittedDocs / totalRequiredDocs) * 100) : 0;

  // CORRECCIÓN: Usar houseNumber para la lógica de etapas
  const checkStage = (houseNumber: string, min: number, max: number) => {
    const num = parseInt(houseNumber, 10);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
  };

  const stagesConfig = [
    { name: 'Etapa 1', range: '1-34', filter: (h: House) => checkStage(h.houseNumber, 1, 34) },
    { name: 'Etapa 2', range: '35-62', filter: (h: House) => checkStage(h.houseNumber, 35, 62) },
    { name: 'Etapa 3', range: '63-88', filter: (h: House) => checkStage(h.houseNumber, 63, 88) },
    { name: 'Etapa 4', range: '89-114', filter: (h: House) => checkStage(h.houseNumber, 89, 114) },
  ];

  const stageProgress = stagesConfig.map(stage => {
    // Filter from activeHouses
    const stageHouses = activeHouses.filter(h => stage.filter(h));
    const totalStageHouses = stageHouses.length;

    // UPDATE: Calculate based on Documents, not fully completed houses
    const totalDocsInStage = totalStageHouses * (REQUIRED_DOCS.length - 1);
    const submittedDocsInStage = stageHouses.reduce((acc, h) =>
      acc + getHouseSubmittedCount(h), 0
    );

    const percentage = totalDocsInStage > 0 ? Math.round((submittedDocsInStage / totalDocsInStage) * 100) : 0;

    return {
      ...stage,
      val: percentage,
      totalHouses: totalStageHouses,
      submittedDocs: submittedDocsInStage,
      totalDocs: totalDocsInStage
    };
  });

  // Detailed breakdown: Documents per Stage AND Total Global
  const docsByStage = useMemo(() => {
    // 1. Calculate Global Total Stats
    const globalDocBreakdown = REQUIRED_DOCS.reduce((acc: any[], docDef) => {
      if (docDef.id === 'catastral') return acc;

      const isLien = docDef.id === 'lien';
      const submittedCount = activeHouses.filter(h => {
        if (isLien) {
          const hLien = h.documents.find(d => d.id === 'lien')?.isSubmitted;
          const hCat = h.documents.find(d => d.id === 'catastral')?.isSubmitted;
          return hLien || hCat;
        }
        return h.documents.find(d => d.id === docDef.id)?.isSubmitted;
      }).length;

      const percentage = totalActiveHouses > 0 ? Math.round((submittedCount / totalActiveHouses) * 100) : 0;

      acc.push({
        ...docDef,
        name: isLien ? 'Gravámenes / Catastral' : docDef.name,
        submitted: submittedCount,
        pending: totalActiveHouses - submittedCount,
        total: totalActiveHouses,
        percentage
      });
      return acc;
    }, []);

    const globalStats = {
      stageName: 'Total Global',
      totalHouses: totalActiveHouses,
      docs: globalDocBreakdown,
      isGlobal: true
    };

    // 2. Calculate Individual Stage Stats
    const stageStats = stagesConfig.map(stage => {
      const stageHouses = activeHouses.filter(h => stage.filter(h));
      const totalHousesInStage = stageHouses.length;

      const docBreakdown = REQUIRED_DOCS.reduce((acc: any[], docDef) => {
        if (docDef.id === 'catastral') return acc;

        const isLien = docDef.id === 'lien';
        const submittedCount = stageHouses.filter(h => {
          if (isLien) {
            const hLien = h.documents.find(d => d.id === 'lien')?.isSubmitted;
            const hCat = h.documents.find(d => d.id === 'catastral')?.isSubmitted;
            return hLien || hCat;
          }
          return h.documents.find(d => d.id === docDef.id)?.isSubmitted;
        }).length;

        const percentage = totalHousesInStage > 0 ? Math.round((submittedCount / totalHousesInStage) * 100) : 0;

        acc.push({
          ...docDef,
          name: isLien ? 'Gravámenes / Catastral' : docDef.name,
          submitted: submittedCount,
          pending: totalHousesInStage - submittedCount,
          total: totalHousesInStage,
          percentage
        });
        return acc;
      }, []);

      return {
        stageName: stage.name,
        totalHouses: totalHousesInStage,
        docs: docBreakdown,
        isGlobal: false
      };
    });

    return [globalStats, ...stageStats];
  }, [activeHouses, totalActiveHouses]);

  // Calculate chart data based on actual submission dates (using activeHouses)
  const chartData = useMemo(() => {
    // Helper to robustly parse dates (ISO YYYY-MM-DD or DD/MM/YYYY)
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;

      // 1. Try standard Date constructor (handles ISO YYYY-MM-DD)
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;

      // 2. Try parsing DD/MM/YYYY or DD-MM-YYYY (Common in manual entry or legacy data)
      const parts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (parts) {
        // Normalize to ISO format (YYYY-MM-DD) to ensure consistency with UTC handling
        const day = parts[1].padStart(2, '0');
        const month = parts[2].padStart(2, '0');
        const year = parts[3];
        const isoDate = `${year}-${month}-${day}`;
        const parsed = new Date(isoDate);
        if (!isNaN(parsed.getTime())) return parsed;
      }

      return null;
    };

    // 1. Extract all submitted dates
    const allDates: string[] = [];
    activeHouses.forEach(h => {
      h.documents.forEach(d => {
        if (d.isSubmitted && d.submissionDate) {
          allDates.push(d.submissionDate);
        }
      });
    });

    if (allDates.length === 0) {
      return [
        { name: 'Inicio', value: 0 },
        { name: 'Hoy', value: 0 }
      ];
    }

    // 2. Aggregate cumulative count
    const totalDocs = totalRequiredDocs;
    const dateMap: Record<string, number> = {};

    allDates.forEach(date => {
      // Normalize key to avoid duplicates from different formats of same date
      const parsed = parseDate(date);

      // FILTER: Ignore dates before 2025 to avoid bad data skewing the chart
      if (parsed && parsed.getFullYear() >= 2025) {
        const key = parsed.toISOString().split('T')[0];
        dateMap[key] = (dateMap[key] || 0) + 1;
      }
    });

    // 3. Sort dates STRICTLY by time using the robust parser
    const uniqueDates = Object.keys(dateMap).sort((a, b) => {
      const dateA = new Date(a); // Keys are now guaranteed ISO
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    let cumulative = 0;

    const result = uniqueDates.map(date => {
      cumulative += dateMap[date];

      const dateObj = new Date(date);
      // Correct for potential timezone shift to display the exact date stored
      const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);

      const displayDate = adjustedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();

      return {
        name: displayDate,
        fullDate: date,
        value: totalDocs > 0 ? Math.round((cumulative / totalDocs) * 100) : 0,
        count: cumulative
      };
    });

    return result;
  }, [activeHouses, totalRequiredDocs]);


  const generatePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(19, 127, 236);
    doc.text("Alcázar de Salamanca", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Informe de Gestión de Medidores Individuales", 14, 26);
    doc.text(`Fecha de Corte: ${new Date().toLocaleDateString()}`, 14, 32);

    // Summary Stats
    doc.setFillColor(246, 247, 248);
    doc.rect(14, 40, 182, 35, 'F');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Casas (Objetivo): ${totalActiveHouses}`, 20, 50);
    doc.text(`Casas Completadas: ${completedCount} (${completionRate}%)`, 20, 57);
    doc.text(`Avance Documental Global: ${globalDocProgress}%`, 20, 64);
    doc.text(`Documentos Recibidos: ${totalSubmittedDocs} / ${totalRequiredDocs}`, 100, 50);
    doc.text(`Documentos Pendientes: ${pendingDocsCount}`, 100, 57);

    // Table - Only active houses
    const tableData = activeHouses.map(h => {
      // Resolve Stage Name based on ID (Consistency with Registry and Dashboard metrics)
      let stageName = h.stage as string;
      const stageConfig = stagesConfig.find(s => s.filter(h));
      if (stageConfig) {
        stageName = stageConfig.name;
      }

      return [
        h.houseNumber,
        h.ownerName,
        stageName, // Corrected: Uses "Etapa X" instead of internal enum
        `${h.progress}%`,
        h.progress === 100 ? 'COMPLETO' : 'PENDIENTE'
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [['Casa', 'Propietario', 'Etapa', 'Progreso', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [19, 127, 236] },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [246, 247, 248] }
    });

    doc.save(`Alcazar_Reporte_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getStatusColor = (progress: number) => {
    if (progress === 100) return 'bg-emerald-500 hover:bg-emerald-600';
    if (progress > 0) return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-orange-400 hover:bg-orange-500';
  };

  const getStatusName = (progress: number) => {
    if (progress === 100) return 'Completado';
    if (progress > 0) return 'Incompleto';
    return 'Pendiente';
  };

  return (
    <div className="p-4 md:p-0 space-y-6 animate-in fade-in duration-500">
      <div className="flex md:hidden justify-between items-center mb-2">
        <h2 className="text-xl font-bold">Indicadores</h2>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* KPI Grid */}
        <div className="md:col-span-1 grid grid-cols-2 gap-3 h-fit">
          <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avance Documental</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold text-primary">{globalDocProgress}%</span>
                <span className="text-xs text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">description</span>
                  {totalSubmittedDocs} / {totalRequiredDocs}
                </span>
              </div>
            </div>
            <div className="relative size-14 flex items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="text-primary transition-all duration-1000 ease-out" strokeDasharray={`${globalDocProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">analytics</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Casas 100%</p>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-2xl font-bold text-slate-800">{completedCount}</span>
              <span className="text-xs text-emerald-500 font-bold mb-1">({completionRate}%)</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-2xl font-bold text-slate-800">{pendingDocsCount}</span>
              <span className="text-xs text-orange-500 font-bold mb-1">Docs</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${totalRequiredDocs > 0 ? (pendingDocsCount / totalRequiredDocs) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <section className="md:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Evolución Documental</h3>
              <p className="text-xs text-slate-400">Excluyendo unidades de constructora</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Total Docs:</span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">{totalSubmittedDocs}</span>
            </div>
          </div>
          <div className="h-48 md:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#137fec" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#64748b', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#137fec" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" name="Avance Global (%)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} minTickGap={20} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Stages Summary */}
        <section className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-lg">Progreso por Etapas</h3>
          <div className="space-y-6">
            {stageProgress.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold">{s.name} <span className="text-xs text-slate-400 font-normal">(Casas {s.range})</span></span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary block">{s.val}%</span>
                    <span className="text-[10px] text-gray-400 font-medium">Doc: {s.submittedDocs}/{s.totalDocs}</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${s.val}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* NEW SECTION: Detailed Doc Breakdown */}
        <section className="md:col-span-2 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Detalle de Documentación por Etapa</h3>
              <p className="text-xs text-slate-400">Estado de entrega por tipo de documento</p>
            </div>
            <span className="material-symbols-outlined text-gray-300">topic</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {docsByStage.map((stage) => (
              <div key={stage.stageName} className={`rounded-lg p-3 border ${stage.isGlobal ? 'bg-blue-50/50 border-blue-100 ring-1 ring-blue-100' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className={`flex items-center justify-between mb-3 border-b pb-2 ${stage.isGlobal ? 'border-blue-100' : 'border-gray-100'}`}>
                  <span className={`font-bold text-sm ${stage.isGlobal ? 'text-blue-800' : 'text-slate-700'}`}>{stage.stageName}</span>
                  <span className={`text-[10px] font-medium bg-white px-2 py-0.5 rounded border ${stage.isGlobal ? 'border-blue-100 text-blue-500' : 'border-gray-100 text-gray-400'}`}>
                    {stage.totalHouses} Casas
                  </span>
                </div>
                <div className="space-y-3">
                  {stage.docs.map(doc => (
                    <div key={doc.id}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="material-symbols-outlined text-[14px] text-gray-400">{doc.icon}</span>
                          <span className="text-[10px] font-medium text-gray-600 truncate max-w-[80px]" title={doc.name}>{doc.name}</span>
                        </div>
                        <span className={`text-[9px] font-bold ${doc.percentage === 100 ? 'text-emerald-500' : 'text-slate-500'}`}>
                          {doc.submitted}/{doc.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${doc.percentage === 100 ? 'bg-emerald-500' : doc.percentage > 50 ? 'bg-primary' : 'bg-orange-400'}`}
                          style={{ width: `${doc.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Heatmap */}
        <section className="md:col-span-3 bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4 md:gap-0">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Mapa de Cumplimiento</h3>
              <p className="text-xs text-slate-500 uppercase tracking-tighter">
                {filterStatus === 'all'
                  ? `Estado de las ${totalActiveHouses} unidades activas`
                  : `Mostrando ${filteredHeatmapHouses.length} unidades filtradas`
                }
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => toggleFilter('completed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border ${filterStatus === 'completed'
                  ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500'
                  : 'bg-white border-transparent hover:bg-gray-50'
                  } ${filterStatus !== 'all' && filterStatus !== 'completed' ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className={`text-xs font-medium ${filterStatus === 'completed' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  Completado ({countCompleted})
                </span>
              </button>

              <button
                onClick={() => toggleFilter('incomplete')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border ${filterStatus === 'incomplete'
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500'
                  : 'bg-white border-transparent hover:bg-gray-50'
                  } ${filterStatus !== 'all' && filterStatus !== 'incomplete' ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className={`text-xs font-medium ${filterStatus === 'incomplete' ? 'text-blue-700' : 'text-slate-500'}`}>
                  Incompleto ({countIncomplete})
                </span>
              </button>

              <button
                onClick={() => toggleFilter('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border ${filterStatus === 'pending'
                  ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-400'
                  : 'bg-white border-transparent hover:bg-gray-50'
                  } ${filterStatus !== 'all' && filterStatus !== 'pending' ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <span className={`text-xs font-medium ${filterStatus === 'pending' ? 'text-orange-700' : 'text-slate-500'}`}>
                  Pendiente ({countPending})
                </span>
              </button>
            </div>
          </div>
          <div className="max-h-64 md:max-h-none overflow-y-auto hide-scrollbar">
            <div className="grid grid-cols-10 md:grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1.5 md:gap-2">
              {filteredHeatmapHouses.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onSelectHouse && onSelectHouse(h.id)}
                  className={`aspect-square rounded flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold transition-transform hover:scale-110 cursor-pointer animate-in fade-in zoom-in duration-300 ${getStatusColor(h.progress)}`}
                  title={`Casa ${h.houseNumber} - ${h.ownerName} (${getStatusName(h.progress)})`}
                >
                  {h.houseNumber}
                </div>
              ))}
            </div>
            {filteredHeatmapHouses.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm italic">
                No hay unidades en esta categoría.
              </div>
            )}
          </div>
          {houses.length !== activeHouses.length && (
            <p className="text-[10px] text-gray-400 mt-2 italic text-right">* {houses.length - activeHouses.length} unidades de constructora excluidas de esta vista</p>
          )}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => onNavigate && onNavigate('registry')}
              className="text-primary font-semibold text-sm hover:underline"
            >
              Ver Detalle Completo
            </button>
          </div>
        </section>
      </div>

      <div className="pb-8 flex justify-end">
        <button
          onClick={generatePDF}
          className="w-full md:w-auto bg-primary text-white py-3 px-8 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-blue-600 transition-colors"
        >
          <span className="material-symbols-outlined">picture_as_pdf</span>
          Generar Informe PDF
        </button>
      </div>
    </div>
  );
};