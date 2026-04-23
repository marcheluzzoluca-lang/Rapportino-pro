import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Download, 
  Trash2, 
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';
import { Technician, Report, TechnicianEvent } from '../types';
import { translations, Language } from '../translations';
import { cn } from '../types';
import { Button, Input, Select } from './UI';
import { downloadFile } from '../utils';

export const TechnicianCalendar = ({ 
  technician, 
  onBack, 
  language, 
  reports,
  setConfirmConfig,
  setAlertConfig
}: { 
  technician: Technician, 
  onBack: () => void, 
  language: Language, 
  reports?: Report[],
  setConfirmConfig: (config: any) => void,
  setAlertConfig: (config: any) => void
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<TechnicianEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({ type: 'trasferta', description: '' });

  const fetchEvents = useCallback(() => {
    console.log(`Fetching events for tech ${technician.id}`);
    fetch(`/api/technicians/${technician.id}/events`)
      .then(res => res.json())
      .then(data => {
        console.log(`Fetched ${data.length} events for tech ${technician.id}`);
        setEvents(data);
      })
      .catch(err => console.error("Error fetching events:", err));
  }, [technician.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, reports?.length]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday

  const getEventsForDay = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = format(d, 'yyyy-MM-dd');
    
    const dayEvents = events.filter(e => e.date === dateStr);
    const dayReports = (reports || [])
      .filter(r => r.technician_id === technician.id)
      .filter(r => r.days?.some(d => d.date === dateStr));
      
    return { dayEvents, dayReports };
  };

  const addEvent = async () => {
    if (!selectedDate) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/technicians/${technician.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, date: dateStr })
      });
      if (res.ok) {
        const saved = await res.json();
        setEvents([...events, { ...newEvent, date: dateStr, id: saved.id, technician_id: technician.id } as TechnicianEvent]);
        setNewEvent({ type: 'trasferta', description: '' });
        setSelectedDate(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Error saving event');
      }
    } catch (e) {
      console.error(e);
      setAlertConfig({
        isOpen: true,
        title: translations[language]['error'],
        message: (e as Error).message || translations[language]['error_saving']
      });
    }
  };

  const deleteEvent = async (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: t('delete_event'),
      message: t('confirm_delete_event'),
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Error deleting event');
          }
          setEvents(events.filter(e => e.id !== id));
          setConfirmConfig(null);
        } catch (e) {
          console.error(e);
          setAlertConfig({
            isOpen: true,
            title: translations[language]['error'],
            message: (e as Error).message || translations[language]['error_deleting']
          });
          setConfirmConfig(null);
        }
      }
    });
  };

  const eventColors: Record<string, string> = {
      ferie: 'bg-green-100 text-green-700 border-green-200',
      trasferta: 'bg-blue-100 text-blue-700 border-blue-200',
      officina: 'bg-orange-100 text-orange-700 border-orange-200',
      malattia: 'bg-red-100 text-red-700 border-red-200',
      appuntamento: 'bg-purple-100 text-purple-700 border-purple-200'
  };

  const getLocale = () => {
    if (language === 'en') return enUS;
    if (language === 'es') return es;
    return it;
  };

  const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft size={20} /></Button>
        <div>
            <h1 className="text-lg font-bold">{technician.name}</h1>
            <p className="text-xs text-slate-500">{t('calendar')}</p>
        </div>
      </header>

      <div className="p-4 flex items-center justify-between">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
            <ChevronLeft />
        </button>
        <div className="flex flex-col items-center">
            <span className="font-bold capitalize">{t(monthKeys[currentDate.getMonth()] as any)} {format(currentDate, 'yyyy')}</span>
            <button 
                onClick={async () => {
                  try {
                    await downloadFile(`/api/export/calendar?technician_id=${technician.id}&month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}&lang=${language}`, `calendar_${technician.name}_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}.xlsx`);
                  } catch (error) {
                    setAlertConfig({
                      isOpen: true,
                      title: translations[language]['error'],
                      message: 'Export failed: ' + (error as Error).message
                    });
                  }
                }}
                className="text-xs text-indigo-600 hover:underline mt-1 flex items-center gap-1"
            >
                <Download size={12} /> {t('calendar_export')}
            </button>
        </div>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
            <ChevronLeft className="rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 p-2 text-center text-xs font-bold text-slate-400 uppercase">
        {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map(d => <div key={d}>{d}</div>)}
      </div>
      
      <div className="grid grid-cols-7 gap-1 p-2 flex-1 overflow-y-auto">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const { dayEvents, dayReports } = getEventsForDay(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            
            return (
                <div 
                    key={day} 
                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                    className={cn(
                        "min-h-[60px] sm:min-h-[80px] border rounded-lg p-1 flex flex-col gap-1 cursor-pointer transition-colors relative",
                        isToday ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-300"
                    )}
                >
                    <span className={cn("text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full", isToday && "bg-indigo-600 text-white")}>{day}</span>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        {dayReports.map(r => (
                            <div key={`report-${r.id}`} className="text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded border truncate bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800" title={r.client_name}>
                                {r.client_name}
                            </div>
                        ))}
                        {dayEvents.map(e => (
                            <div key={e.id} className={cn("text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded border truncate", eventColors[e.type])} title={e.type}>
                                {e.type}
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div 
                initial={{ y: 100 }} animate={{ y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-4 shadow-xl flex flex-col gap-4"
            >
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold capitalize">{format(selectedDate, 'eeee d MMMM', { locale: getLocale() })}</h3>
                    <button onClick={() => setSelectedDate(null)}><X size={20} /></button>
                </div>
                
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {(() => {
                        const { dayEvents, dayReports } = getEventsForDay(selectedDate.getDate());
                        return (
                            <>
                                {dayReports.map(r => (
                                    <div key={`report-${r.id}`} className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Rapportino</span>
                                            <span className="text-xs text-slate-500">{r.client_name} - {r.description}</span>
                                        </div>
                                    </div>
                                ))}
                                {dayEvents.map(e => (
                                    <div key={e.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase">{t(e.type as any)}</span>
                                            <span className="text-xs text-slate-500">{e.description}</span>
                                        </div>
                                        <button onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }} className="text-rose-500"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                                {dayEvents.length === 0 && dayReports.length === 0 && <p className="text-center text-sm text-slate-400 py-2">{t('no_events')}</p>}
                            </>
                        );
                    })()}
                </div>

                <div className="flex flex-col gap-3 pt-2 border-t">
                    <Select 
                        label={t('event_type')}
                        value={newEvent.type} 
                        onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                        options={[
                            { value: 'trasferta', label: t('trasferta') },
                            { value: 'ferie', label: t('ferie') },
                            { value: 'officina', label: t('officina') },
                            { value: 'malattia', label: t('malattia') },
                            { value: 'appuntamento', label: t('appuntamento') }
                        ]}
                    />
                    <Input 
                        label={t('notes')} 
                        value={newEvent.description} 
                        onChange={e => setNewEvent({...newEvent, description: e.target.value})} 
                        placeholder={t('details')}
                    />
                    <Button onClick={addEvent}>{t('add_event')}</Button>
                </div>
            </motion.div>
        </div>
      )}
    </div>
  );
};
