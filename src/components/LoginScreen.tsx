import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  ChevronRight, 
  AlertCircle
} from 'lucide-react';
import { Technician } from '../types';
import { translations, Language } from '../translations';
import { Button } from './UI';

export const LoginScreen = ({ 
  onLogin, 
  settings, 
  technicians, 
  language,
  setAlertConfig
}: { 
  onLogin: (user: any) => void, 
  settings: Record<string, string>,
  technicians: Technician[],
  language: Language,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    setLoading(true);
    setError('');
    
    // Admin login
    if (code === (settings.password || 'pab2000srl')) {
      onLogin({ type: 'admin', name: 'Amministratore' });
      setLoading(false);
      return;
    }

    // Technician login
    const tech = technicians.find(t => t.code === code);
    if (tech) {
      onLogin({ type: 'technician', id: tech.id, name: tech.name });
      setLoading(false);
      return;
    }

    // Try server login
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        setError(t('invalid_code') || 'Codice non valido');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 flex items-center justify-center text-white">
            <Lock size={40} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Rapportini Pro</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gestione Interventi Tecnici</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-400 ml-1">{t('access_code')}</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                placeholder="Inserisci il tuo codice" 
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm font-medium border border-rose-100 dark:border-rose-900/30">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            size="lg" 
            className="w-full py-4 rounded-2xl text-lg shadow-lg shadow-indigo-500/20"
            loading={loading}
          >
            {t('access') || 'Accedi'} <ChevronRight size={20} />
          </Button>
        </form>

        <p className="text-center text-slate-400 text-sm font-medium">
          Contatta l'amministratore se non hai un codice
        </p>
      </div>
    </div>
  );
};
