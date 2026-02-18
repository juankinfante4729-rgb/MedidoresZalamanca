import React, { useState } from 'react';
import { House, REQUIRED_DOCS } from '../types';

interface HouseDetailProps {
  house: House;
  globalProgress: number;
  onBack: () => void;
  onUpdateStatus: (houseId: number, docId: string, status: boolean) => void;
  onUpdateDate: (houseId: number, docId: string, date: string) => void;
  onUpdateInfo: (houseId: number, data: { ownerName: string; phoneNumber: string; houseNumber: string; isConstructora: boolean }) => void;
}

export const HouseDetail: React.FC<HouseDetailProps> = ({ house, globalProgress, onBack, onUpdateStatus, onUpdateDate, onUpdateInfo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    ownerName: house.ownerName,
    phoneNumber: house.phoneNumber,
    houseNumber: house.houseNumber,
    isConstructora: house.isConstructora
  });

  const completedDocs = house.documents.filter(d => d.isSubmitted).length;
  const progress = Math.round((completedDocs / REQUIRED_DOCS.length) * 100);

  const handleSave = () => {
    onUpdateInfo(house.id, editData);
    setIsEditing(false);
  };

  return (
    <div className="pb-24 md:pb-8 animate-in slide-in-from-right duration-300 max-w-3xl mx-auto md:bg-white md:shadow-lg md:rounded-2xl md:my-4 md:border md:border-gray-200 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined text-gray-700">arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
                Casa {house.houseNumber}
                {house.isConstructora && (
                    <span className="text-[9px] bg-gray-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-normal">Constructora</span>
                )}
              </h1>
              <nav className="flex items-center gap-1 text-xs text-primary font-medium">
                <span>Registro</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                <span className="text-gray-500">Detalle</span>
              </nav>
            </div>
          </div>
          <button className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-gray-700">more_horiz</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section className="bg-white md:bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100 md:border-gray-200 relative group">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="absolute top-4 right-4 text-xs font-bold text-primary hover:text-primary/80 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-all"
          >
            {isEditing ? 'Cancelar' : 'Editar Datos'}
          </button>

          <div className="flex gap-4">
            <div 
              className={`size-20 rounded-lg bg-cover bg-center border border-gray-200 shadow-sm ${house.isConstructora ? 'grayscale' : ''}`}
              style={{ backgroundImage: "url('https://picsum.photos/200?blur=1')" }}
            ></div>
            <div className="flex-1 pr-16">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold leading-tight text-slate-800 mb-1">Alcázar de Salamanca</h2>
              </div>
              
              {isEditing ? (
                <div className="space-y-3 mt-2 max-w-sm animate-in fade-in">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Propietario</label>
                    <input 
                      type="text" 
                      value={editData.ownerName}
                      onChange={(e) => setEditData({...editData, ownerName: e.target.value})}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Teléfono</label>
                      <input 
                        type="text" 
                        value={editData.phoneNumber}
                        onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Casa #</label>
                      <input 
                        type="text" 
                        value={editData.houseNumber}
                        onChange={(e) => setEditData({...editData, houseNumber: e.target.value})}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  {/* Constructora Toggle */}
                  <div className="flex items-center gap-2 pt-1">
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={editData.isConstructora} 
                            onChange={(e) => setEditData({...editData, isConstructora: e.target.checked})}
                            className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-600"></div>
                     </label>
                     <span className="text-xs text-gray-600">Es propiedad de constructora (excluir de métricas)</span>
                  </div>

                  <button 
                    onClick={handleSave}
                    className="mt-2 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-600 transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mt-1 font-medium">Propietario: {house.ownerName}</p>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="material-symbols-outlined text-[14px] text-gray-400">call</span>
                     <p className="text-xs text-gray-500">{house.phoneNumber}</p>
                  </div>
                  {house.isConstructora && (
                      <p className="text-xs text-gray-400 italic mt-2">
                        <span className="material-symbols-outlined text-[14px] align-middle mr-1">visibility_off</span>
                        Excluido de reportes globales
                      </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {!house.isConstructora ? (
            <section className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Completado</p>
                <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-primary">{progress}%</span>
                <div className="w-full bg-gray-100 h-2 rounded-full mb-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{completedDocs} de {REQUIRED_DOCS.length} Docs</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Progreso Global</p>
                <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-emerald-500">{globalProgress}%</span>
                <div className="w-full bg-gray-100 h-2 rounded-full mb-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${globalProgress}%` }}></div>
                </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Promedio Proyecto</p>
            </div>
            </section>
        ) : (
            <section className="bg-gray-100 rounded-xl p-4 text-center border border-gray-200 border-dashed">
                <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">engineering</span>
                <p className="text-sm font-semibold text-gray-600">Unidad de Constructora</p>
                <p className="text-xs text-gray-500">Esta unidad no requiere seguimiento documental individual por el momento.</p>
            </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-slate-800">Lista de Requisitos</h3>
            {!house.isConstructora && <button className="text-sm font-semibold text-primary hover:underline">Marcar Todos</button>}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-100">
              {house.documents.map((doc) => (
                <label key={doc.id} className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors select-none group ${house.isConstructora ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${doc.isSubmitted ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        <span className="material-symbols-outlined text-xl">{doc.icon}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">{doc.name}</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${doc.isSubmitted ? 'text-emerald-500' : 'text-orange-500'}`}>
                            {doc.isSubmitted ? 'Entregado:' : 'Pendiente de entrega'}
                            </span>
                            {doc.isSubmitted && (
                                <input 
                                    type="date" 
                                    value={doc.submissionDate || ''} 
                                    onChange={(e) => onUpdateDate(house.id, doc.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] border-0 bg-transparent p-0 text-gray-500 font-medium focus:ring-0 cursor-pointer hover:text-primary h-4"
                                />
                            )}
                        </div>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={doc.isSubmitted}
                    onChange={(e) => onUpdateStatus(house.id, doc.id, e.target.checked)}
                    className="checkbox-custom h-6 w-6 rounded border-gray-300 text-primary focus:ring-primary/20 bg-transparent cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-800">Notas Internas</h3>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <textarea 
              className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm placeholder:text-gray-400 resize-none" 
              placeholder="Añadir nota privada sobre este registro..." 
              rows={3}
            ></textarea>
            <div className="flex justify-end mt-2 pt-2 border-t border-gray-50">
              <button className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Guardar Nota</button>
            </div>
          </div>
        </section>

        <section className="space-y-4 pb-4">
          <h3 className="text-lg font-bold text-slate-800">Historial de Actividad</h3>
          <div className="space-y-6 ml-3 border-l border-gray-200 pl-8 relative">
            <div className="relative">
              <div className="absolute left-[-37px] top-1 size-[10px] rounded-full bg-primary border-2 border-white shadow-sm"></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Hoy, 14:20</p>
              <p className="text-sm mt-1 font-medium text-slate-700">Documento "Impuesto Predial" marcado como entregado</p>
              <p className="text-xs text-gray-400">Acción por: Admin Maria</p>
            </div>
            <div className="relative">
              <div className="absolute left-[-37px] top-1 size-[10px] rounded-full bg-gray-300 border-2 border-white shadow-sm"></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Ayer, 09:15</p>
              <p className="text-sm mt-1 font-medium text-slate-700">Registro creado</p>
              <p className="text-xs text-gray-400">Acción por: Sistema</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};