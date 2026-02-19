import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HOME_HERO_IMAGE } from '../constants';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'asistente'>('login');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'asistente' && chatContainerRef.current) {
      chatContainerRef.current.innerHTML = '';
      import('https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js' as any)
        .then((mod) => {
          mod.createChat({
            webhookUrl: 'https://serviciosinfante.app.n8n.cloud/webhook/901af3b2-700c-40a3-a80c-b66ba5d9e719/chat',
            target: chatContainerRef.current,
            mode: 'fullscreen',
            showWelcomeMessage: true,
            title: 'Asistente Alcázar',
            subtitle: 'Atención al Vecino 24/7',
            style: { primaryColor: '#3b82f6', userMessageColor: '#3b82f6', botMessageColor: '#f1f5f9', backgroundColor: '#ffffff' },
            i18n: { en: { title: 'Soporte Administrativo', placeholder: 'Escribe tu consulta aquí...', send: 'Enviar' } }
          });
        }).catch(err => console.error(err));
    }
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      {/* Contenedor principal con ancho máximo controlado */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[650px] border border-white">
        
        {/* PANEL IZQUIERDO: Foto Nítida (60% de ancho para mejor impacto visual) */}
        <div className="hidden md:flex flex-col justify-between w-[60%] bg-slate-900 p-12 text-white relative">
          <div className="absolute inset-0 bg-cover bg-center opacity-100" style={{ backgroundImage: `url('${HOME_HERO_IMAGE}')` }}></div>
          {/* Sutil gradiente oscuro solo en la base para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
          
          <div className="relative z-10">
            <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-3xl mb-6 border border-white/30">A</div>
            <h1 className="text-4xl font-extrabold leading-tight drop-shadow-xl">Alcázar de <br/>Salamanca</h1>
            <p className="text-slate-100 mt-2 text-lg font-medium drop-shadow-md">Gestión de Medidores</p>
          </div>

          <div className="relative z-10">
             <button 
                onClick={() => setActiveTab(activeTab === 'login' ? 'asistente' : 'login')}
                className="inline-flex items-center gap-3 py-3 px-8 rounded-2xl bg-white text-blue-600 font-bold hover:bg-blue-50 transition-all shadow-xl hover:scale-105 active:scale-95"
             >
                <span className="material-symbols-outlined">{activeTab === 'login' ? 'support_agent' : 'login'}</span>
                <span>{activeTab === 'login' ? 'Centro de Ayuda' : 'Volver al Login'}</span>
             </button>
          </div>
        </div>

        {/* PANEL DERECHO: Formulario Acortado (40% de ancho) */}
        <div className="w-full md:w-[40%] bg-white flex flex-col items-center justify-center relative border-l border-slate-50">
          
          <div className={`w-full max-w-[340px] px-6 transition-all duration-500 ${activeTab === 'login' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="mb-10">
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Bienvenido</h2>
                <p className="text-slate-500 text-sm font-medium">Accede a tu cuenta</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-primary transition-all text-sm" placeholder="Correo electrónico" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-primary transition-all text-sm" placeholder="Contraseña" required />
                <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-all active:scale-95 text-sm">
                    {loading ? "Cargando..." : "Iniciar Sesión"}
                </button>
            </form>
          </div>

          {/* ASISTENTE (Ocupa todo el panel derecho cuando se activa) */}
          <div className={`absolute inset-0 flex flex-col transition-all duration-500 ${activeTab === 'asistente' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-base">Asistente Virtual</h3>
                <button onClick={() => setActiveTab('login')} className="p-2 hover:bg-slate-200 rounded-lg">
                    <span className="material-symbols-outlined text-slate-600 text-lg">close</span>
                </button>
             </div>
             <div id="n8n-chat-container" ref={chatContainerRef} className="flex-1 bg-white overflow-hidden relative"></div>
          </div>

        </div>
      </div>
    </div>
  );
};