import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Plus, 
  Save,
  X
} from 'lucide-react';
import { Client, Machine } from '../types';
import { translations, Language } from '../translations';
import { Button, Input } from './UI';

export const ClientForm = ({ 
  client, 
  onSave, 
  onBack, 
  language,
  setAlertConfig
}: { 
  client?: Client | null, 
  onSave: (data: any) => void, 
  onBack: () => void, 
  language: Language,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [formData, setFormData] = useState({
    name: client?.name || '',
    address: client?.address || '',
    phone: client?.phone || '',
    email: client?.email || '',
    km: client?.km || 0,
    machines: client?.machines || [] as Machine[]
  });

  const addMachine = () => {
    setFormData(prev => ({
      ...prev,
      machines: [...prev.machines, { brand: '', type: '', serial_number: '', year: '' }]
    }));
  };

  const updateMachine = (index: number, field: keyof Machine, value: string) => {
    setFormData(prev => {
      const newMachines = [...prev.machines];
      newMachines[index] = { ...newMachines[index], [field]: value };
      return { ...prev, machines: newMachines };
    });
  };

  const removeMachine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      machines: prev.machines.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{client ? t('edit_client') : t('new_client')}</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('personal_data')}</h2>
          <Input label={t('name')} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label={t('address')} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('phone')} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            <Input label={t('km_base')} type="number" value={formData.km} onChange={e => setFormData({ ...formData, km: Number(e.target.value) })} />
          </div>
          <Input label={t('email')} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </section>

        <section className="flex flex-col gap-4 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('machines')}</h2>
            <Button variant="secondary" size="sm" onClick={addMachine}><Plus size={16} /> {t('new')}</Button>
          </div>
          {formData.machines.map((machine, index) => (
            <div key={index} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3 relative">
              <button onClick={() => removeMachine(index)} className="absolute top-2 right-2 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg">
                <X size={16} />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t('brand')} value={machine.brand} onChange={e => updateMachine(index, 'brand', e.target.value)} />
                <Input label={t('type')} value={machine.type} onChange={e => updateMachine(index, 'type', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label={t('serial_number')} value={machine.serial_number} onChange={e => updateMachine(index, 'serial_number', e.target.value)} />
                <Input label={t('year')} value={machine.year} onChange={e => updateMachine(index, 'year', e.target.value)} />
              </div>
            </div>
          ))}
        </section>
      </div>
      <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-area-bottom">
        <Button className="w-full" size="lg" onClick={() => onSave(formData)}>
          <Save size={20} /> {t('save_client')}
        </Button>
      </footer>
    </div>
  );
};
