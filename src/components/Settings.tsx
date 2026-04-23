import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Upload, 
  Download, 
  Trash2, 
  ArrowRight 
} from 'lucide-react';
import { Company } from '../types';
import { translations, Language } from '../translations';
import { Button, Input } from './UI';
import { CompaniesList } from './Lists';
import { cn } from '../types';

export const Settings = ({ 
  onReset, 
  onBackup, 
  onRestore, 
  onToggleTheme, 
  isDark, 
  settings, 
  onUpdateSetting, 
  onLogout, 
  language, 
  onSetLanguage, 
  companies, 
  onNewCompany, 
  onEditCompany, 
  onDeleteCompany, 
  onSync,
  setConfirmConfig,
  setAlertConfig
}: { 
  onReset: () => void, 
  onBackup: () => void, 
  onRestore: (data: any) => void, 
  onToggleTheme: () => void, 
  isDark: boolean, 
  settings: Record<string, string>, 
  onUpdateSetting: (key: string, value: string) => void, 
  onLogout: () => void, 
  language: Language, 
  onSetLanguage: (l: Language) => void, 
  companies: Company[], 
  onNewCompany: () => void, 
  onEditCompany: (c: Company) => void, 
  onDeleteCompany: (id: number) => void, 
  onSync: () => Promise<void>,
  setConfirmConfig: (config: any) => void,
  setAlertConfig: (config: any) => void
}) => {
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const t = (key: keyof typeof translations['it']) => translations[language][key];

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          onRestore(json);
        } catch (err) {
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: t('restore_error')
          });
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
        <div className="bg-indigo-100 dark:bg-indigo-950/30 p-4 rounded-full text-indigo-600">
          <SettingsIcon size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{t('protected_settings')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('enter_password')}</p>
        </div>
        <Input 
          type="password" 
          placeholder={t('password')} 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          className="text-center"
        />
        <Button className="w-full" onClick={() => {
          if (password === (settings.password || 'pab2000srl')) {
            setIsAuth(true);
          } else {
            setAlertConfig({
              isOpen: true,
              title: translations[language]['error'],
              message: t('wrong_password')
            });
          }
        }}>
          {t('access')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <CompaniesList 
            companies={companies} 
            onNew={onNewCompany} 
            onEdit={onEditCompany} 
            onDelete={onDeleteCompany} 
            language={language} 
            setConfirmConfig={setConfirmConfig}
            setAlertConfig={setAlertConfig}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider ml-1">{t('appearance')}</h2>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {isDark ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold">{t('dark_mode')}</p>
                  <p className="text-xs text-slate-500">{t('dark_mode_desc')}</p>
                </div>
              </div>
              <button 
                onClick={onToggleTheme}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  isDark ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  isDark ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider ml-1">{t('data')}</h2>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
            <button 
              onClick={async () => {
                if (isSyncing) return;
                setIsSyncing(true);
                try {
                  await onSync();
                  setAlertConfig({
                    isOpen: true,
                    title: translations[language]['success'],
                    message: t('sync_success')
                  });
                } catch (e) {
                  console.error('Sync failed:', e);
                  setAlertConfig({
                    isOpen: true,
                    title: translations[language]['error'],
                    message: t('error')
                  });
                } finally {
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing}
              className="flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  {isSyncing ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload size={20} className="text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-500">{t('sync')}</p>
                  <p className="text-xs text-slate-500">{t('sync_desc')}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-300" />
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <button onClick={onBackup} className="flex items-center justify-between text-left group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                  <Download size={20} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-500">{t('backup_data')}</p>
                  <p className="text-xs text-slate-500">{t('backup_desc')}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-300" />
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <label className="flex items-center justify-between text-left group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                  <Upload size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-500">{t('restore_backup')}</p>
                  <p className="text-xs text-slate-500">{t('restore_desc')}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-300" />
              <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
            </label>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <button onClick={onReset} className="flex items-center justify-between text-left group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
                  <Trash2 size={20} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-500">{t('reset_total')}</p>
                  <p className="text-xs text-slate-500">{t('reset_desc')}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-300" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
