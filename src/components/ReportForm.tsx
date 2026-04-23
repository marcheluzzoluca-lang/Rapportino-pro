import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save,
  Utensils,
  Bed,
  Calendar,
  Clock,
  Car,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { Client, Technician, Article, Company, Report } from '../types';
import { translations, Language } from '../translations';
import { Button, Input, Select, SearchableSelect, SignatureCapture } from './UI';

const ExpandableLabel = ({ children, text }: { children: React.ReactNode, text: string }) => (
  <div className="group relative w-full h-[18px] cursor-pointer outline-none" tabIndex={0}>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 z-10 bg-transparent group-hover:bg-slate-800 dark:group-hover:bg-slate-100 group-focus-within:bg-slate-800 dark:group-focus-within:bg-slate-100 px-1 py-1 group-hover:px-2 group-focus-within:px-2 rounded-full group-hover:shadow-lg group-focus-within:shadow-lg">
      <div className="text-slate-400 group-hover:text-white dark:group-hover:text-slate-900 group-focus-within:text-white dark:group-focus-within:text-slate-900 shrink-0 transition-colors flex items-center justify-center">
        {children}
      </div>
      <div className="max-w-0 opacity-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-1.5 group-focus-within:max-w-[150px] group-focus-within:opacity-100 group-focus-within:ml-1.5 flex items-center">
        <span className="text-[10px] whitespace-nowrap font-bold text-white dark:text-slate-900 uppercase tracking-widest">
          {text}
        </span>
      </div>
    </div>
  </div>
);

export const ReportForm = ({ 
  clients, 
  technicians, 
  articles, 
  companies,
  report, 
  currentUser,
  onSave, 
  onBack,
  language,
  isSaving = false,
  setAlertConfig,
  refreshData
}: { 
  clients: Client[], 
  technicians: Technician[], 
  articles: Article[], 
  companies: Company[],
  report?: Report | null,
  currentUser: any,
  onSave: (data: any) => void, 
  onBack: () => void,
  language: Language,
  isSaving?: boolean,
  setAlertConfig: (config: any) => void,
  refreshData?: () => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  
  const [rememberCompany, setRememberCompany] = useState(localStorage.getItem('rapportini_remember_company') === 'true');

  const [formData, setFormData] = useState({
    client_id: report?.client_id?.toString() || '',
    technician_id: report?.technician_id?.toString() || (currentUser?.type === 'technician' ? currentUser.id.toString() : ''),
    machine_id: report?.machine_id?.toString() || '',
    company_id: report?.company_id?.toString() || (rememberCompany && !report ? localStorage.getItem('rapportini_default_company') || '' : ''),
    description: report?.description || '',
    signature_client: report?.signature_client || '',
    signature_tech: report?.signature_tech || '',
    client_km: report?.client_km || 0,
    extra_km: report?.extra_km || 0,
    days: report?.days?.map(d => ({ ...d })) || [{ date: format(new Date(), 'yyyy-MM-dd'), travel_hours: 0, work_hours: 0, meals: 0, overnight: false }],
    items: report?.items?.map(i => ({ article_id: i.article_id, quantity: i.quantity })) || [] as { article_id: number, quantity: number }[]
  });

  useEffect(() => {
    localStorage.setItem('rapportini_remember_company', rememberCompany.toString());
    if (rememberCompany && formData.company_id) {
      localStorage.setItem('rapportini_default_company', formData.company_id);
    } else if (!rememberCompany) {
      localStorage.removeItem('rapportini_default_company');
    }
  }, [rememberCompany, formData.company_id]);

  const [showNewMachine, setShowNewMachine] = useState(false);
  const [newMachine, setNewMachine] = useState({ brand: '', type: '', serial_number: '', year: '' });

  const selectedClient = clients.find(c => c.id.toString() === formData.client_id);
  const clientMachines = selectedClient?.machines || [];

  const handleAddMachine = async () => {
    if (!formData.client_id) return;
    try {
      const res = await fetch(`/api/clients/${formData.client_id}/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMachine)
      });
      if (res.ok) {
        const { id } = await res.json();
        setFormData(prev => ({ ...prev, machine_id: id.toString() }));
        setShowNewMachine(false);
        setNewMachine({ brand: '', type: '', serial_number: '', year: '' });
        if (refreshData) refreshData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Errore salvataggio macchina');
      }
    } catch (err) {
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (err as Error).message || 'Errore nel salvataggio della macchina'
      });
    }
  };

  useEffect(() => {
    if (formData.client_id) {
      const client = clients.find(c => c.id.toString() === formData.client_id);
      if (client && !report) {
        setFormData(prev => ({ ...prev, client_km: client.km }));
      }
    }
  }, [formData.client_id, clients, report]);

  const addDay = () => {
    setFormData(prev => ({
      ...prev,
      days: [...prev.days, { date: format(new Date(), 'yyyy-MM-dd'), travel_hours: 0, work_hours: 0, meals: 0, overnight: false }]
    }));
  };

  const removeDay = (index: number) => {
    if (formData.days.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      days: prev.days.filter((_, i) => i !== index)
    }));
  };

  const updateDay = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newDays = [...prev.days];
      newDays[index] = { ...newDays[index], [field]: value };
      return { ...prev, days: newDays };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { article_id: 0, quantity: 1 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleAddCustomArticle = async (description: string, index: number) => {
    try {
      const uniqueCode = `VARIE-${Date.now()}`;
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: uniqueCode, description, price: 0 })
      });
      if (res.ok) {
        const newArticle = await res.json();
        if (refreshData) {
          await refreshData();
        }
        updateItem(index, 'article_id', newArticle.id);
      }
    } catch (err) {
      console.error('Failed to add custom article', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{report ? t('edit_report') : t('new_report')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('general_info')}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Select 
                label={
                  <>
                    <span>{t('company')}</span>
                    <label htmlFor="rememberCompany" className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        id="rememberCompany"
                        checked={rememberCompany}
                        onChange={(e) => setRememberCompany(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      {t('remember_company')}
                    </label>
                  </>
                } 
                value={formData.company_id} 
                onChange={e => setFormData({...formData, company_id: e.target.value})} 
                options={companies.map(c => ({ value: c.id, label: c.name }))}
                placeholder={t('select_company')}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchableSelect 
              label={t('client')} 
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              value={formData.client_id}
              onChange={val => setFormData({ ...formData, client_id: val, machine_id: '' })}
            />
            <SearchableSelect 
              label={t('technician')} 
              options={technicians.map(t => ({ value: t.id, label: t.name }))}
              value={formData.technician_id}
              onChange={val => setFormData({ ...formData, technician_id: val })}
              disabled={currentUser?.type === 'technician'}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-1">{t('machines')}</label>
              {formData.client_id && (
                <button 
                  onClick={() => setShowNewMachine(!showNewMachine)}
                  className="text-xs text-indigo-600 font-bold flex items-center gap-1"
                >
                  {showNewMachine ? t('cancel') : <><Plus size={12} /> {t('add_machine')}</>}
                </button>
              )}
            </div>
            
            {showNewMachine ? (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={t('brand')} value={newMachine.brand} onChange={e => setNewMachine({...newMachine, brand: e.target.value})} />
                  <Input label={t('type')} value={newMachine.type} onChange={e => setNewMachine({...newMachine, type: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label={t('serial_number')} value={newMachine.serial_number} onChange={e => setNewMachine({...newMachine, serial_number: e.target.value})} />
                  <Input label={t('year')} value={newMachine.year} onChange={e => setNewMachine({...newMachine, year: e.target.value})} />
                </div>
                <Button size="sm" onClick={handleAddMachine}>{t('save')}</Button>
              </div>
            ) : (
              <Select 
                options={clientMachines.map(m => ({ value: (m.id || '').toString(), label: `${m.brand} ${m.type} (${m.serial_number})` }))}
                value={formData.machine_id}
                disabled={!formData.client_id}
                onChange={e => setFormData({ ...formData, machine_id: e.target.value })}
              />
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('intervention_days')}</h2>
            <Button variant="secondary" size="sm" onClick={addDay}><Plus size={16} /> {/* Aggiungi Giorno non ha chiave, la aggiungiamo? No per ora non l'ho definita. Anzi la aggiungo. */} {t('add_day') || 'Aggiungi Giorno'}</Button>
          </div>
          <div className="flex flex-col gap-3">
            {formData.days.map((day, index) => (
              <div key={index} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">{(t('day') || 'GIORNO').toUpperCase()} {index + 1}</span>
                  {formData.days.length > 1 && (
                    <button onClick={() => removeDay(index)} className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="flex items-end gap-2 w-[calc(100%+12px)] -ml-3 sm:w-full sm:ml-0">
                  <div className="flex-1 min-w-[100px]">
                    <Input 
                      label={<ExpandableLabel text={t('date')}><Calendar size={14} /></ExpandableLabel>}
                      type="date" 
                      value={day.date}
                      onChange={e => updateDay(index, 'date', e.target.value)}
                      className="cursor-pointer w-full text-xs sm:text-sm px-1 sm:px-3 text-center min-w-0"
                    />
                  </div>
                  <div className="w-[45px] sm:w-[70px] shrink-0">
                    <Input 
                      label={<ExpandableLabel text={t('work_hours')}><Clock size={14} /></ExpandableLabel>} 
                      type="number" 
                      step="0.5"
                      value={day.work_hours}
                      onChange={e => updateDay(index, 'work_hours', Number(e.target.value))}
                      className="text-center text-xs sm:text-sm px-0 sm:px-2 min-w-0"
                    />
                  </div>
                  <div className="w-[45px] sm:w-[70px] shrink-0">
                    <Input 
                      label={<ExpandableLabel text={t('travel_hours')}><Car size={14} /></ExpandableLabel>} 
                      type="number" 
                      step="0.5"
                      value={day.travel_hours}
                      onChange={e => updateDay(index, 'travel_hours', Number(e.target.value))}
                      className="text-center text-xs sm:text-sm px-0 sm:px-2 min-w-0"
                    />
                  </div>
                  <div className="w-[45px] sm:w-[70px] shrink-0">
                    <Input 
                      label={<ExpandableLabel text={t('meals')}><Utensils size={14} /></ExpandableLabel>} 
                      type="number" 
                      value={day.meals}
                      onChange={e => updateDay(index, 'meals', Number(e.target.value))}
                      className="text-center text-xs sm:text-sm px-0 sm:px-2 min-w-0"
                    />
                  </div>
                  <label className="shrink-0 flex flex-col items-center justify-end gap-2.5 mb-1 cursor-pointer h-full pb-[6px] w-[30px] sm:w-[40px]">
                    <ExpandableLabel text={t('overnight')}><Bed size={14} /></ExpandableLabel>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 sm:w-5 sm:h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={day.overnight}
                      onChange={e => updateDay(index, 'overnight', e.target.checked)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('kilometers')}</h2>
          <div className="grid grid-cols-3 gap-4">
            <Input 
              label={<><MapPin size={14} className="text-slate-400" /> {t('km_client')}</>} 
              type="number" 
              value={formData.client_km}
              onChange={e => setFormData({ ...formData, client_km: Number(e.target.value) })}
            />
            <Input 
              label={<><MapPin size={14} className="text-slate-400" /> {t('km_extra')}</>} 
              type="number" 
              value={formData.extra_km}
              onChange={e => setFormData({ ...formData, extra_km: Number(e.target.value) })}
            />
            <Input 
              label={<><MapPin size={14} className="text-slate-400" /> {t('total_km')}</>} 
              type="number" 
              value={Number(formData.client_km || 0) + Number(formData.extra_km || 0)}
              readOnly
              className="bg-slate-100 dark:bg-slate-800"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('notes')}</h2>
          <Input 
            label={t('description')} 
            type="textarea" 
            rows={4}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('items')}</h2>
            <Button variant="secondary" size="sm" onClick={addItem}><Plus size={16} /> {t('add') || 'Aggiungi'}</Button>
          </div>
          
          {formData.items.map((item, index) => (
            <div key={index} className="flex gap-2 items-end bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex-1 min-w-0">
                <SearchableSelect 
                  options={articles.map(a => ({ value: a.id, label: `${a.code} - ${a.description}` }))}
                  value={item.article_id}
                  onChange={val => updateItem(index, 'article_id', Number(val))}
                  onAddCustom={(val) => handleAddCustomArticle(val, index)}
                />
              </div>
              <div className="w-16 sm:w-20 shrink-0">
                <Input 
                  type="number" 
                  value={item.quantity}
                  onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                  placeholder={t('quantity') || 'Q.tà'}
                  className="px-2 text-center"
                />
              </div>
              <button onClick={() => removeItem(index)} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl shrink-0">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-6 pb-10">
          <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">{t('signatures')}</h2>
          <SignatureCapture 
            label={t('signature_tech')} 
            onSave={data => setFormData({ ...formData, signature_tech: data })} 
            initialValue={formData.signature_tech}
          />
          <SignatureCapture 
            label={t('signature_client')} 
            onSave={data => setFormData({ ...formData, signature_client: data })} 
            initialValue={formData.signature_client}
          />
        </section>
      </div>

      <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-area-bottom">
        <Button 
          className="w-full" 
          size="lg" 
          onClick={() => onSave(formData)}
          disabled={isSaving || !formData.client_id || !formData.technician_id}
          loading={isSaving}
        >
          <Save size={20} /> {t('save_report')}
        </Button>
      </footer>
    </div>
  );
};
