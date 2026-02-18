import React, { useState, useEffect, useCallback } from 'react';
import { Home } from './components/Home';
import { Dashboard } from './components/Dashboard';
import { Registry } from './components/Registry';
import { HouseDetail } from './components/HouseDetail';
import { Login } from './components/Login';
import { ViewState, House, REQUIRED_DOCS, DocStatus } from './types';
import { MOCK_HOUSES } from './constants';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

// Helper to inject metadata into documents JSON for persistence without schema migration
const prepareDocsForSave = (docs: DocStatus[], isConstructora: boolean, livesAbroad: boolean = false) => {
  // Filter out any existing metadata to avoid duplicates
  const cleanDocs = docs.filter(d => d.id !== 'METADATA_IS_CONSTRUCTORA' && d.id !== 'METADATA_LIVES_ABROAD');
  
  // Append metadata
  return [
    ...cleanDocs,
    {
      id: 'METADATA_IS_CONSTRUCTORA',
      name: 'METADATA',
      icon: 'code',
      isSubmitted: isConstructora,
      status: 'approved' as const
    },
    {
      id: 'METADATA_LIVES_ABROAD',
      name: 'METADATA',
      icon: 'public',
      isSubmitted: livesAbroad,
      status: 'approved' as const
    }
  ];
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<ViewState>('home');
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialCheck, setInitialCheck] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [showRlsBanner, setShowRlsBanner] = useState(false);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialCheck(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    if (!session) return; // Don't load if not authenticated

    try {
      setLoading(true);
      setShowRlsBanner(false);
      
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      setIsConnected(true);

      if (data && data.length > 0) {
        const mappedHouses: House[] = data.map((row: any) => {
           let rawDocuments = row.documents;
           if (!rawDocuments || !Array.isArray(rawDocuments) || rawDocuments.length === 0) {
             rawDocuments = REQUIRED_DOCS.map(d => ({
               id: d.id,
               name: d.name,
               icon: d.icon,
               isSubmitted: false,
               status: 'pending'
             }));
           }

           const metaDoc = rawDocuments.find((d: any) => d.id === 'METADATA_IS_CONSTRUCTORA');
           const abroadDoc = rawDocuments.find((d: any) => d.id === 'METADATA_LIVES_ABROAD');
           
           const documents = rawDocuments.filter((d: any) => !d.id.startsWith('METADATA_'));

           const submittedCount = documents.filter((d: any) => d.isSubmitted).length;
           const progress = Math.round((submittedCount / REQUIRED_DOCS.length) * 100);

           const isConstructora = metaDoc ? metaDoc.isSubmitted : (row.is_constructora || false);
           const livesAbroad = abroadDoc ? abroadDoc.isSubmitted : false;

           return {
            id: row.id,
            houseNumber: row.house_number,
            ownerName: row.owner_name,
            phoneNumber: row.phone_number,
            stage: row.stage as any,
            documents: documents,
            progress: progress,
            lastActivity: row.last_activity || 'Sin actividad reciente',
            isConstructora: isConstructora,
            livesAbroad: livesAbroad,
            imageUrl: row.image_url
          };
        });
        setHouses(mappedHouses);
      } else {
        console.log("Database empty. Seeding mock data...");
        // Only seed if we have write permission (which we should if authenticated)
        const seedData = MOCK_HOUSES.map(h => ({
          id: h.id,
          house_number: h.houseNumber,
          owner_name: h.ownerName,
          phone_number: h.phoneNumber,
          documents: prepareDocsForSave(h.documents, h.isConstructora, false),
          stage: h.stage,
          last_activity: h.lastActivity,
        }));

        const { error: insertError } = await supabase.from('houses').insert(seedData);
        
        if (insertError) {
          console.error("Error seeding data:", insertError);
          // Don't show banner for duplicate key errors, just means data exists but load failed
          if (insertError.code !== '23505') setShowRlsBanner(true);
          setHouses(MOCK_HOUSES.map(h => ({...h, livesAbroad: false}))); 
          setIsConnected(false);
        } else {
          loadData();
        }
      }
    } catch (err: any) {
      console.error("Error loading houses:", err);
      // Pese a estar logueado, podría haber error de RLS si la politica esta mal configurada
      setShowRlsBanner(true); 
      setHouses(MOCK_HOUSES.map(h => ({...h, livesAbroad: false}))); 
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
        loadData();
    }
  }, [session, loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setHouses([]);
    setView('home');
  };

  const handleHouseSelect = (id: number) => {
    setSelectedHouseId(id);
    setView('detail');
  };

  const updateHouseStatus = async (houseId: number, docId: string, status: boolean) => {
    const houseIndex = houses.findIndex(h => h.id === houseId);
    if (houseIndex === -1) return;

    const currentHouse = houses[houseIndex];

    const newDocs: DocStatus[] = currentHouse.documents.map(d => 
      d.id === docId ? { 
        ...d, 
        isSubmitted: status, 
        status: status ? 'approved' : 'pending',
        submissionDate: status ? (d.submissionDate || new Date().toISOString().split('T')[0]) : undefined
      } : d
    );

    const submittedCount = newDocs.filter(d => d.isSubmitted).length;
    const progress = Math.round((submittedCount / REQUIRED_DOCS.length) * 100);

    const updatedHouse = { ...currentHouse, documents: newDocs as any, progress };

    setHouses(prev => {
      const newHouses = [...prev];
      newHouses[houseIndex] = updatedHouse;
      return newHouses;
    });

    if (isConnected && session) {
      try {
        const docsWithMeta = prepareDocsForSave(newDocs, currentHouse.isConstructora, currentHouse.livesAbroad);
        await supabase
          .from('houses')
          .update({ 
            documents: docsWithMeta,
            last_activity: 'Hace un momento'
          })
          .eq('id', houseId);
      } catch (err) {
        console.error("Network/Supabase Error:", err);
      }
    }
  };

  const updateDocDate = async (houseId: number, docId: string, date: string) => {
    const houseIndex = houses.findIndex(h => h.id === houseId);
    if (houseIndex === -1) return;

    const currentHouse = houses[houseIndex];
    const newDocs = currentHouse.documents.map(d => 
      d.id === docId ? { ...d, submissionDate: date } : d
    );
    const updatedHouse = { ...currentHouse, documents: newDocs as any };

    setHouses(prev => {
      const newHouses = [...prev];
      newHouses[houseIndex] = updatedHouse;
      return newHouses;
    });

    if (isConnected && session) {
      try {
        const docsWithMeta = prepareDocsForSave(newDocs, currentHouse.isConstructora, currentHouse.livesAbroad);
        await supabase
          .from('houses')
          .update({ documents: docsWithMeta })
          .eq('id', houseId);
      } catch (err) {
         console.error("Error updating date:", err);
      }
    }
  };

  const updateHouseInfo = async (houseId: number, data: { ownerName: string; phoneNumber: string; houseNumber: string; isConstructora: boolean; livesAbroad: boolean; imageUrl?: string }) => {
    setHouses(prev => prev.map(h => {
      if (h.id === houseId) {
        return { ...h, ...data };
      }
      return h;
    }));

    if (isConnected && session) {
        try {
        const currentHouse = houses.find(h => h.id === houseId);
        const currentDocs = currentHouse?.documents || [];
        const docsWithMeta = prepareDocsForSave(currentDocs, data.isConstructora, data.livesAbroad);

        const updates: any = {
            owner_name: data.ownerName,
            phone_number: data.phoneNumber,
            house_number: data.houseNumber,
            documents: docsWithMeta,
        };

        if (data.imageUrl) {
            updates.image_url = data.imageUrl;
        }

        await supabase
            .from('houses')
            .update(updates)
            .eq('id', houseId);
        } catch (err) {
            console.error("Error updating info:", err);
        }
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium animate-pulse">Sincronizando datos...</p>
        </div>
      );
    }

    switch (view) {
      case 'home':
        return <Home houses={houses} onNavigate={(v) => setView(v)} />;
      case 'dashboard':
        return <Dashboard houses={houses} onNavigate={(v) => setView(v)} onSelectHouse={handleHouseSelect} />;
      case 'registry':
        return <Registry houses={houses} onSelectHouse={handleHouseSelect} onUpdateStatus={updateHouseStatus} />;
      case 'detail':
        const house = houses.find(h => h.id === selectedHouseId);
        if (!house) return <div>Cargando...</div>;
        
        const activeHouses = houses.filter(h => !h.isConstructora);
        const totalDocs = activeHouses.length * REQUIRED_DOCS.length;
        const submittedDocs = activeHouses.reduce((acc, h) => acc + h.documents.filter(d => d.isSubmitted).length, 0);
        const globalProgress = totalDocs > 0 ? Math.round((submittedDocs / totalDocs) * 100) : 0;

        return (
          <HouseDetail 
            house={house} 
            globalProgress={globalProgress}
            onBack={() => setView('registry')} 
            onUpdateStatus={updateHouseStatus}
            onUpdateDate={updateDocDate}
            onUpdateInfo={updateHouseInfo}
          />
        );
      default:
        return <Home houses={houses} onNavigate={(v) => setView(v)} />;
    }
  };

  // 1. Loading Initial Check
  if (initialCheck) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="size-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      );
  }

  // 2. Show Login if no session
  if (!session) {
      return <Login />;
  }

  // 3. Authenticated App
  return (
    <div className="min-h-screen bg-background-light flex flex-col md:flex-row text-slate-900">
      {showRlsBanner && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white px-4 py-3 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined bg-white/20 p-1 rounded">warning</span>
                <div className="text-sm">
                    <p className="font-bold">Error de Permisos (RLS)</p>
                    <p className="opacity-90">Tu usuario no tiene permisos para escribir. Revisa las políticas en Supabase.</p>
                </div>
            </div>
            <button onClick={() => setShowRlsBanner(false)} className="bg-white/20 hover:bg-white/30 rounded p-1">
                <span className="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
      )}

      <aside className={`hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 p-4 ${showRlsBanner ? 'mt-[60px]' : ''}`}>
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <div className="size-8 rounded bg-primary flex items-center justify-center text-white font-bold">A</div>
          <div>
            <h1 className="font-bold leading-tight text-sm">Alcázar de Salamanca</h1>
            <p className="text-[10px] text-slate-500">Gestión de Medidores</p>
          </div>
        </div>
        
        <nav className="space-y-1 flex-1">
          <button 
            onClick={() => setView('home')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'home' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${view === 'home' ? 'filled' : ''}`}>home</span>
            Inicio
          </button>
          
          <button 
            onClick={() => setView('registry')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'registry' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${view === 'registry' ? 'filled' : ''}`}>description</span>
            Registro y Control
          </button>

          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${view === 'dashboard' ? 'filled' : ''}`}>bar_chart</span>
            Indicadores
          </button>
        </nav>

        <div className="pt-4 border-t border-slate-200 space-y-2">
           <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
             <div className={`size-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
             {isConnected ? 'Conectado' : 'Sin Conexión'}
           </div>
           
           <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
           >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative">
        <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="size-8 rounded bg-primary flex items-center justify-center text-white font-bold">A</div>
             <span className="font-bold text-slate-800">Alcázar</span>
           </div>
           <button onClick={handleLogout} className="text-gray-500">
             <span className="material-symbols-outlined">logout</span>
           </button>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;