import React, { useState, useEffect } from 'react';
import { House, REQUIRED_DOCS, ADMIN_DOCS } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RegistryProps {
  houses: House[];
  onSelectHouse: (houseId: number) => void;
  onUpdateStatus: (houseId: number, docId: string, status: boolean) => void;
  isAdministrationView?: boolean;
}

export const Registry: React.FC<RegistryProps> = ({ houses, onSelectHouse, onUpdateStatus, isAdministrationView = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Etapa 1' | 'Etapa 2' | 'Etapa 3' | 'Etapa 4'>('All');
  const [selectedDocFilters, setSelectedDocFilters] = useState<string[]>([]);
  const [filterAbroad, setFilterAbroad] = useState(false);
  const [filterConstructora, setFilterConstructora] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  useEffect(() => { setVisibleCount(40); }, [searchTerm, filter, selectedDocFilters, filterAbroad, filterConstructora]);

  const docTypes = isAdministrationView ? ADMIN_DOCS : REQUIRED_DOCS;

  // CORRECCIÓN: Usar houseNumber en lugar de ID para determinar la etapa
  // Esto asegura que funcione correctamente con la base de datos real
  const getStage = (houseNumber: string) => {
    const num = parseInt(houseNumber, 10);
    if (isNaN(num)) return 'Etapa 4'; // Fallback

    if (num <= 34) return 'Etapa 1';
    if (num <= 62) return 'Etapa 2';
    if (num <= 88) return 'Etapa 3';
    return 'Etapa 4';
  };

  const getStageRange = (stage: string) => {
    switch (stage) {
      case 'Etapa 1': return '1-34';
      case 'Etapa 2': return '35-62';
      case 'Etapa 3': return '63-88';
      case 'Etapa 4': return '89-114';
      default: return null;
    }
  };

  const toggleDocFilter = (docId: string) => {
    setSelectedDocFilters(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const filteredHouses = houses.filter(h => {
    // Si es vista de administración, por defecto se centra en constructoras,
    // pero permitimos que el usuario use los filtros rápidos para refinar.
    if (isAdministrationView && !h.isConstructora) return false;

    const matchesSearch = h.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) || h.houseNumber.includes(searchTerm);
    if (!matchesSearch) return false;

    if (filter !== 'All') {
      const houseStage = getStage(h.houseNumber);
      if (filter !== houseStage) return false;
    }

    if (filterAbroad && !h.livesAbroad) return false;
    if (filterConstructora && !h.isConstructora) return false;

    if (selectedDocFilters.length > 0) {
      // Las unidades de constructora no suelen tener seguimiento documental detallado igual que los copropietarios
      if (h.isConstructora && !isAdministrationView) return false;
      const hasPendingDoc = h.documents.some(d =>
        selectedDocFilters.includes(d.id) && !d.isSubmitted
      );
      if (!hasPendingDoc) return false;
    }

    return true;
  });

  const generatePendingReport = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const housesForReport = filteredHouses.filter(h => !h.isConstructora && h.progress < 100);

    doc.setFontSize(18);
    doc.setTextColor(19, 127, 236);
    doc.text("Reporte de Seguimiento Documental", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Alcázar de Salamanca - Gestión de Medidores Individuales", 14, 26);
    doc.text(`Generado el ${dateStr} a las ${timeStr}`, 14, 32);

    doc.setFillColor(248, 250, 252);
    doc.rect(14, 38, 182, 10, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL UNIDADES PENDIENTES EN LISTADO: ${housesForReport.length}`, 18, 44.5);

    const tableData = housesForReport.map(h => {
      const docStatusList = h.documents.map(d => {
        const marker = d.isSubmitted ? "DONE:" : "TODO:";
        return `${marker}${d.name}`;
      }).join('\n');

      const ownerLabel = h.livesAbroad ? `${h.ownerName} (EXTERIOR)` : h.ownerName;

      return [
        h.houseNumber,
        ownerLabel,
        getStage(h.houseNumber),
        docStatusList
      ];
    });

    autoTable(doc, {
      startY: 52,
      head: [['Casa', 'Propietario', 'Etapa', 'Estado de Documentación']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [19, 127, 236], fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
      styles: { fontSize: 6.5, cellPadding: 1.5, valign: 'middle', lineWidth: 0.1, lineColor: [220, 220, 220] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 110, minCellHeight: 12 }
      },
      margin: { left: 14, right: 14 },
      alternateRowStyles: { fillColor: [253, 253, 253] },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.text = [];
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const rawText = data.row.raw[3] as string;
          const lines = rawText.split('\n').filter(l => l.trim());
          const half = Math.ceil(lines.length / 2);
          const colWidth = data.cell.width / 2;

          lines.forEach((line, index) => {
            const isSecondCol = index >= half;
            const rowIndex = isSecondCol ? index - half : index;

            const startX = data.cell.x + 3;
            const offsetX = isSecondCol ? colWidth : 0;
            const startY = data.cell.y + 4.5 + (rowIndex * 3.8);

            const isDone = line.startsWith("DONE:");
            const cleanLine = line.replace("DONE:", "").replace("TODO:", "");

            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");

            if (isDone) {
              doc.setFillColor(34, 197, 94);
              doc.circle(startX + offsetX + 0.8, startY - 0.8, 0.6, 'F');
              doc.setTextColor(34, 197, 94);
            } else {
              doc.setFillColor(239, 68, 68);
              doc.circle(startX + offsetX + 0.8, startY - 0.8, 0.6, 'F');
              doc.setTextColor(239, 68, 68);
            }

            doc.text(cleanLine, startX + offsetX + 3.5, startY);
          });
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    if (finalY < 275) {
      doc.setFontSize(10);
      doc.setTextColor(19, 127, 236);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN DE FALTANTES POR TIPO:", 14, finalY);

      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");

      let currentY = finalY + 8;
      docTypes.forEach((docType, index) => {
        const totalMissing = housesForReport.filter(h =>
          h.documents.find(d => d.id === docType.id && !d.isSubmitted)
        ).length;

        const col = index % 2 === 0 ? 14 : 105;
        if (index % 2 !== 0) currentY -= 5;

        if (totalMissing > 0) {
          doc.setTextColor(239, 68, 68);
          doc.setFillColor(239, 68, 68);
          doc.circle(col + 0.8, currentY - 0.8, 0.5, 'F');
        } else {
          doc.setTextColor(150);
          doc.setFillColor(200, 200, 200);
          doc.circle(col + 0.8, currentY - 0.8, 0.5, 'F');
        }

        doc.text(`${docType.name}: ${totalMissing} unidades pendientes`, col + 4, currentY);
        currentY += 5;
      });
    }

    doc.save(`Reporte_Seguimiento_${now.toISOString().split('T')[0]}.pdf`);
  };

  const generatePendingOnlyReport = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const housesForReport = filteredHouses.filter(h => !h.isConstructora && h.progress < 100);

    doc.setFontSize(18);
    doc.setTextColor(19, 127, 236);
    doc.text("Reporte de Documentos PENDIENTES", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Alcázar de Salamanca - Pendientes por residente", 14, 26);
    doc.text(`Generado el ${dateStr} a las ${timeStr}`, 14, 32);

    doc.setFillColor(248, 250, 252);
    doc.rect(14, 38, 182, 10, 'F');
    doc.setFontSize(8.5);
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL UNIDADES PENDIENTES EN LISTADO: ${housesForReport.length}`, 18, 44.5);

    const tableData = housesForReport.map(h => {
      const pendingOnly = h.documents
        .filter(d => !d.isSubmitted)
        .map(d => `TODO:${d.name}`)
        .join('\n');

      const ownerLabel = h.livesAbroad ? `${h.ownerName} (EXTERIOR)` : h.ownerName;

      return [
        h.houseNumber,
        ownerLabel,
        getStage(h.houseNumber),
        pendingOnly
      ];
    });

    autoTable(doc, {
      startY: 52,
      head: [['Casa', 'Propietario', 'Etapa', 'Documentos Pendientes']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [220, 46, 37], fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
      styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle', lineWidth: 0.1, lineColor: [220, 220, 220] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 50 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 110, minCellHeight: 12 } },
      margin: { left: 14, right: 14 },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.text = [];
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const rawText = data.row.raw[3] as string;
          const lines = rawText.split('\n').filter(l => l.trim());
          const half = Math.ceil(lines.length / 2);
          const colWidth = data.cell.width / 2;

          lines.forEach((line, index) => {
            const isSecondCol = index >= half;
            const rowIndex = isSecondCol ? index - half : index;

            const startX = data.cell.x + 3;
            const offsetX = isSecondCol ? colWidth : 0;
            const startY = data.cell.y + 4.5 + (rowIndex * 3.8);

            const isDone = line.startsWith("DONE:");
            const cleanLine = line.replace("DONE:", "").replace("TODO:", "");

            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");

            if (isDone) {
              doc.setFillColor(34, 197, 94);
              doc.circle(startX + offsetX + 0.8, startY - 0.8, 0.6, 'F');
              doc.setTextColor(34, 197, 94);
            } else {
              doc.setFillColor(239, 68, 68);
              doc.circle(startX + offsetX + 0.8, startY - 0.8, 0.6, 'F');
              doc.setTextColor(239, 68, 68);
            }

            doc.text(cleanLine, startX + offsetX + 3.5, startY);
          });
        }
      }
    });

    doc.save(`Reporte_Pendientes_${now.toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="pt-4 pb-24 md:pb-8 animate-in fade-in duration-500">
      <div className="px-4 md:px-0 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-800">
          {isAdministrationView ? 'Sección Administrativa Exclusiva' : 'Registro de Copropietarios'}
        </h2>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input type="text" placeholder="Buscar por nombre o casa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterAbroad(!filterAbroad)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${filterAbroad ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-slate-600 border-gray-200 hover:border-blue-200'}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${filterAbroad ? 'filled' : ''}`}>public</span>
              Residentes Exterior
            </button>
            <button
              onClick={() => setFilterConstructora(!filterConstructora)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${filterConstructora ? 'bg-slate-700 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-gray-200 hover:border-slate-300'}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${filterConstructora ? 'filled' : ''}`}>domain</span>
              Unidades Constructora
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {!isAdministrationView && ['All', 'Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4'].map((f) => (
              <button key={f} onClick={() => setFilter(f as any)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'bg-white border border-gray-200 text-slate-600 hover:bg-gray-50'}`}>
                <span>{f === 'All' ? 'Todos' : f}</span>
                {getStageRange(f) && <span className={`text-[10px] ${filter === f ? 'text-white/80' : 'text-slate-400'}`}>({getStageRange(f)})</span>}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrar por documento PENDIENTE:</span>
            <div className="flex flex-wrap gap-2">
              {docTypes.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => toggleDocFilter(doc.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedDocFilters.includes(doc.id)
                    ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                    : 'bg-white text-slate-500 border-gray-200 hover:border-orange-300'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${selectedDocFilters.includes(doc.id) ? 'text-white' : 'text-slate-400'}`}>{doc.icon}</span>
                  {doc.name}
                  {selectedDocFilters.includes(doc.id) && <span className="material-symbols-outlined text-[14px]">close</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-0 mt-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resultados: {filteredHouses.length} unidades</span>
          {!isAdministrationView && (
            <div className="flex items-center gap-2">
              <button
                onClick={generatePendingReport}
                className="flex items-center gap-2 text-primary hover:text-blue-700 font-bold text-sm transition-colors bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                Generar Reporte PDF Limpio
              </button>

              <button
                onClick={generatePendingOnlyReport}
                className="flex items-center gap-2 text-[#e11d48] bg-[#fff1f2] hover:bg-[#ffe4e6] font-bold text-sm transition-all px-4 py-2 rounded-xl border border-[#fecdd3] shadow-sm hover:shadow-md"
              >
                <span className="material-symbols-outlined text-lg">warning</span>
                Generar Reporte SOLO Pendientes
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredHouses.slice(0, visibleCount).map(house => (
            <div key={house.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">

              <div className="absolute top-6 right-6 flex gap-2 items-center">
                {!house.isConstructora && house.progress < 100 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const pendingDocs = house.documents.filter(d => !d.isSubmitted);
                      const docList = pendingDocs.map(d => `• ${d.name}`).join('\n');
                      const message = `Hola ${house.ownerName}, te saludamos de Alcázar de Salamanca. 👋\n\nTe recordamos que para completar tu registro de la Casa ${house.houseNumber}, aún tenemos pendientes los siguientes documentos:\n\n${docList}\n\nQuedamos atentos a tu entrega para poder finalizar el proceso. ¡Muchas gracias! 😊`;

                      navigator.clipboard.writeText(message);
                      alert('📝 Copiado: Mensaje de recordatorio listo para pegar en WhatsApp.');
                    }}
                    className="size-7 rounded-full bg-blue-50 text-primary flex items-center justify-center border border-blue-100 shadow-sm hover:bg-primary hover:text-white hover:scale-110 active:scale-95 transition-all group/wa"
                    title="Copiar recordatorio para WhatsApp"
                  >
                    <span className="material-symbols-outlined text-[15px] filled">content_copy</span>
                  </button>
                )}
                {house.isConstructora && (
                  <span className="material-symbols-outlined text-orange-500 text-2xl animate-pulse" title="Propiedad Constructora">domain</span>
                )}
                {house.livesAbroad && (
                  <span className="material-symbols-outlined text-blue-500 text-2xl" title="Vive en el exterior">public</span>
                )}
              </div>

              <div className="mb-5 cursor-pointer" onClick={() => handleHouseSelect(house.id)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${house.isConstructora ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'}`}>
                    CASA {house.houseNumber}
                  </span>
                  {!isAdministrationView && <span className="text-[10px] text-gray-400 font-medium">{getStage(house.houseNumber)}</span>}
                </div>

                <h4 className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors flex items-center gap-2">
                  {house.ownerName}
                </h4>
              </div>

              <div className="grid grid-cols-6 gap-2 mb-6">
                {house.documents.map((doc, idx) => (
                  <button
                    key={idx}
                    disabled={house.isConstructora && !isAdministrationView}
                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(house.id, doc.id, !doc.isSubmitted); }}
                    title={doc.name + (doc.isSubmitted ? ' (Completado)' : ' (Pendiente)')}
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${house.isConstructora && !isAdministrationView
                      ? 'bg-slate-50 text-slate-200 cursor-default'
                      : doc.isSubmitted
                        ? 'bg-green-50 text-green-500'
                        : 'bg-slate-50 text-slate-300 hover:bg-slate-100'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-xl ${doc.isSubmitted ? 'filled' : ''}`}>{doc.icon}</span>
                  </button>
                ))}
              </div>

              {house.isConstructora ? (
                <div className="w-full py-4 rounded-2xl bg-[#f7fafc] border border-[#edf2f7] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[#718096] text-xl">domain</span>
                  <span className="text-[#718096] text-[12px] font-semibold">Propiedad Constructora</span>
                </div>
              ) : (
                <div className={`w-full py-3.5 rounded-2xl text-center text-[11px] font-bold transition-colors ${house.progress === 100 ? 'bg-green-50 text-green-600' : 'bg-slate-50/80 text-slate-400'}`}>
                  {house.progress === 100 ? 'COMPLETADO' : `${house.progress}% AVANCE`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {filteredHouses.length > visibleCount && (
        <div className="flex justify-center mt-12">
          <button onClick={() => setVisibleCount(v => v + 40)} className="bg-white border border-gray-200 px-8 py-2.5 rounded-full text-sm font-semibold text-primary shadow-sm hover:bg-gray-50 transition-colors">
            Cargar más
          </button>
        </div>
      )}
    </div>
  );

  function handleHouseSelect(id: number) {
    onSelectHouse(id);
  }
};