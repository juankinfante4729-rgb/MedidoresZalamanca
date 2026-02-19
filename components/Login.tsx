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
            
            // --- AJUSTES DE PERSONALIDAD DEL AGENTE ---
            title: 'Asistente Alcázar',
            subtitle: 'Atención al Vecino 24/7',
            footer: 'Plataforma Administrativa Alcázar de Salamanca',
            initialMessages: [
                '¡Hola! 👋 Soy tu asistente del Alcázar de Salamanca.',
                'Puedo ayudarte a consultar el estado de tu casa, revisar documentos pendientes o resolver dudas sobre tus medidores.',
                '¿En qué puedo apoyarte hoy?'
            ],
            
            // --- AJUSTES ESTILIZADOS ---
            style: {
                primaryColor: '#137fec', // Sincronizado con tu botón azul
                userMessageColor: '#137fec',
                botMessageColor: '#f1f5f9',
                backgroundColor: '#ffffff',
            },
            i18n: {
                en: {
                    title: 'Soporte Administrativo',
                    placeholder: 'Escribe tu consulta aquí...',
                    send: 'Enviar'
                }
            }
          });
        })
        .catch(err => console.error("Error al ajustar el agente:", err));
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-['Inter']">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[650px] border border-white">
        
        {/* PANEL IZQUIERDO: Branding (Diseño conservado) */}
        <div className="hidden md:flex flex-col justify-between w-5/12 bg-slate-900 p-12 text-white relative">
          <div className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-700 hover:scale-105" style={{ backgroundImage: `url('${HOME_HERO_IMAGE}')` }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
          
          <div className="relative z-10">
            <div className="size-14 rounded-2xl bg-[#137fec] flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-xl shadow-blue-600/40">A</div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight">Alcázar de <br/>Salamanca</h1>
            <p className="text-slate-300 mt-4 text-lg font-medium opacity-90">Gestión de Medidores</p>
          </div>

          <div className="relative z-10 mt-auto">
             <button 
                onClick={() => setActiveTab(activeTab === 'login' ? 'asistente' : 'login')}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all backdrop-blur-md group"
             >
                <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">
                    {activeTab === 'login' ? 'support_agent' : 'login'}
                </span>
                <span className="font-bold tracking-wide">
                    {activeTab === 'login' ? 'CENTRO DE AYUDA' : 'VOLVER AL INGRESO'}
                </span>
             </button>
          </div>
        </div>

        {/* PANEL DERECHO: Dinámico */}
        <div className="w-full md:w-7/12 bg-white relative">
          
          {/* VISTA: LOGIN */}
          <div className={`absolute inset-0 p-8 md:p-16 flex flex-col justify-center transition-all duration-500 ${activeTab === 'login' ? 'opacity-100' : 'opacity-0 -translate-x-full pointer-events-none'}`}>
            <div className="mb-10">
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Bienvenido</h2>
                <p className="text-slate-500 mt-2 font-medium">Ingresa tus datos para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all" placeholder="admin@alcazar.com" required />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all" placeholder="••••••••" required />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#137fec] text-white font-bold py-5 rounded-2xl shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg">
                    {loading ? <div className="size-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : "Iniciar Sesión"}
                </button>
            </form>
          </div>

          {/* VISTA: ASISTENTE AJUSTADO */}
          <div className={`absolute inset-0 flex flex-col transition-all duration-500 ${activeTab === 'asistente' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="size-3 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                    <h3 className="font-bold text-slate-800 tracking-tight text-lg">Asistente Virtual</h3>
                </div>
                <button onClick={() => setActiveTab('login')} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-slate-600">close</span>
                </button>
             </div>
             
             {/* El agente se inyecta aquí con el estilo nuevo */}
             <div ref={chatContainerRef} className="flex-1 bg-white overflow-hidden relative"></div>
          </div>

        </div>
      </div>
    </div>
  );
};