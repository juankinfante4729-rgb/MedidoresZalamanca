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
            title: '¡Hola! 👋', 
            subtitle: 'En línea',
            style: {
                primaryColor: '#3b82f6',
                backgroundColor: '#ffffff',
            },
            i18n: {
                en: { // Mantenemos el español forzado
                    title: 'Soporte Administrativo',
                    placeholder: 'Escribe tu consulta aquí...', 
                    send: 'Enviar'
                }
            }
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
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[650px] border border-white">
        
        {/* PANEL IZQUIERDO: FOTO AL 60% */}
        <div className="hidden md:flex flex-col justify-between w-[60%] bg-slate-900 p-12 text-white relative">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${HOME_HERO_IMAGE}')` }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
          
          <div className="relative z-10">
            <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-3xl mb-6 border border-white/30">A</div>
            <h1 className="text-4xl font-extrabold leading-tight">Alcázar de <br/>Salamanca</h1>
            <p className="text-slate-100 mt-2 text-lg font-medium">Gestión de Medidores</p>
          </div>

          <div className="relative z-10">
             <button 
                onClick={() => setActiveTab(activeTab === 'login' ? 'asistente' : 'login')}
                className="inline-flex items-center gap-3 py-3 px-8 rounded-2xl bg-white text-blue-600 font-bold hover:bg-blue-50 transition-all shadow-xl"
             >
                <span className="material-symbols-outlined">{activeTab === 'login' ? 'support_agent' : 'login'}</span>
                <span>{activeTab === 'login' ? 'Centro de Ayuda' : 'Volver al Inicio'}</span>
             </button>
          </div>
        </div>

        {/* PANEL DERECHO: LOGIN AL 40% */}
        <div className="w-full md:w-[40%] bg-white flex flex-col relative border-l border-slate-50">
          
          {/* VISTA LOGIN */}
          <div className={`absolute inset-0 p-8 flex flex-col justify-center items-center transition-all duration-500 ${activeTab === 'login' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="w-full max-w-[280px]">
                <h2 className="text-2xl font-extrabold text-slate-800 mb-2 text-center">Bienvenido</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-primary outline-none text-sm" placeholder="Correo" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-primary outline-none text-sm" placeholder="Contraseña" required />
                    <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-all text-sm">
                        {loading ? "Entrando..." : "Iniciar Sesión"}
                    </button>
                </form>
            </div>
          </div>

          {/* VISTA ASISTENTE (ID de fuerza aplicado) */}
          <div className={`absolute inset-0 flex flex-col transition-all duration-500 ${activeTab === 'asistente' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             <div className="p-3 flex justify-end">
                <button onClick={() => setActiveTab('login')} className="p-1 hover:bg-slate-100 rounded-lg">
                    <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
                </button>
             </div>
             {/* Este ID activa la altura fija de 550px definida en el index.html */}
             <div id="n8n-chat-render-area" ref={chatContainerRef} className="bg-white overflow-hidden relative mx-auto w-full"></div>
          </div>

        </div>
      </div>
    </div>
  );
};