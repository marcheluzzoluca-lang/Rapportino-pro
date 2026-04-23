import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Search, 
  Check, 
  AlertCircle, 
  Info,
  Loader2
} from 'lucide-react';
import SignaturePad from 'signature_pad';
import { cn } from '../types';
import { translations, Language } from '../translations';

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost', 
  size?: 'sm' | 'md' | 'lg',
  loading?: boolean
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button 
      className={cn(
        'rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
};

export const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & { label?: React.ReactNode, error?: string }) => {
  const Component = props.type === 'textarea' ? 'textarea' : 'input';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-1 flex items-center gap-1.5">{label}</label>}
      <Component 
        onFocus={(e) => {
          if (props.type === 'number') (e.target as HTMLInputElement).select();
          props.onFocus?.(e as any);
        }}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all",
          error && "border-red-500 focus:ring-red-500",
          props.className
        )}
        {...props as any}
      />
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  );
};

export const Select = ({ label, options, error, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: React.ReactNode, options: { value: string | number, label: string }[], error?: string }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <div className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-1 flex items-center gap-1.5 justify-between">{label}</div>}
      <div className="relative">
        <select 
          className={cn(
            "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none",
            error && "border-red-500 focus:ring-red-500",
            props.className
          )}
          {...props}
        >
          <option value="">Seleziona...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronLeft size={16} className="-rotate-90" />
        </div>
      </div>
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  );
};

export const SearchableSelect = ({ label, options, value, onChange, placeholder = "Cerca...", error, disabled, onAddCustom }: { 
  label?: string, 
  options: { value: string | number, label: string }[], 
  value: string | number, 
  onChange: (value: string) => void,
  placeholder?: string,
  error?: string,
  disabled?: boolean,
  onAddCustom?: (value: string) => void
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value.toString() === value.toString());
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("flex flex-col gap-1.5 w-full relative", disabled && "opacity-60 pointer-events-none")} ref={containerRef}>
      {label && <label className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-1">{label}</label>}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer transition-all",
          isOpen && "ring-2 ring-indigo-500 border-indigo-500",
          error && "border-red-500",
          disabled && "cursor-not-allowed bg-slate-50 dark:bg-slate-800"
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-slate-400")}>
          {selectedOption ? selectedOption.label : "Seleziona..."}
        </span>
        <ChevronLeft size={16} className={cn("transition-transform text-slate-400", isOpen ? "rotate-90" : "-rotate-90")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-64"
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder={placeholder}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border-none text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => (
                  <div 
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value.toString());
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors",
                      value.toString() === opt.value.toString() && "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 font-bold"
                    )}
                  >
                    {opt.label}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                  <span>Nessun risultato trovato</span>
                </div>
              )}
              
              {onAddCustom && search.trim() !== '' && !options.some(opt => opt.label.toLowerCase() === search.trim().toLowerCase()) && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 sticky bottom-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCustom(search);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className="w-full px-3 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors flex items-center justify-center gap-2"
                  >
                    + Aggiungi "{search}"
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  );
};

export const Card = ({ children, className, onClick, ...props }: React.ComponentProps<'div'>) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm",
      onClick && "cursor-pointer active:scale-[0.98] transition-transform",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const SignatureCapture = ({ label, onSave, initialValue }: { label: string, onSave: (data: string) => void, initialValue?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(!!initialValue);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && padRef.current) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = padRef.current.toData();
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      padRef.current.clear();
      padRef.current.fromData(data);
      if (padRef.current.isEmpty() && initialValue) {
          padRef.current.fromDataURL(initialValue);
      }
    }
  }, [initialValue]);

  useEffect(() => {
    if (canvasRef.current) {
      padRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        minWidth: 1,
        maxWidth: 2.5,
        throttle: 16,
        velocityFilterWeight: 0.7
      });
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      if (initialValue) {
        padRef.current.fromDataURL(initialValue);
      }
    }
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      padRef.current?.off();
    };
  }, []);

  useEffect(() => {
     if (initialValue && padRef.current && padRef.current.isEmpty()) {
         padRef.current.fromDataURL(initialValue);
         setIsConfirmed(true);
     }
  }, [initialValue]);

  const clear = () => {
    padRef.current?.clear();
    setIsConfirmed(false);
    onSave('');
  };

  const save = () => {
    if (padRef.current && !padRef.current.isEmpty()) {
      setIsConfirmed(true);
      onSave(padRef.current.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label>
        {isConfirmed ? (
          <span className="text-[10px] font-bold uppercase text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            <Check size={10} /> Confermata
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase text-rose-600 flex items-center gap-1 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full">
            <AlertCircle size={10} /> Da confermare
          </span>
        )}
      </div>
      <div className={cn(
        "border rounded-xl overflow-hidden bg-white transition-all duration-300",
        isConfirmed ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm" : "border-rose-200 dark:border-rose-900/30 ring-2 ring-rose-500/10"
      )}>
        <canvas 
          ref={canvasRef} 
          className="w-full h-48 touch-none cursor-crosshair block" 
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={clear} type="button">Pulisci</Button>
        <Button 
          variant={isConfirmed ? "secondary" : "primary"} 
          size="sm" 
          onClick={save} 
          type="button"
          className={cn(isConfirmed && "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100")}
        >
          {isConfirmed ? "Firma Salvata" : "Conferma Firma"}
        </Button>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  language
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void | Promise<void>, 
  onCancel: () => void,
  language: Language
}) => {
  const t = (key: keyof typeof translations['it']) => translations[language][key];
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3 text-rose-500">
          <AlertCircle size={24} />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400">{message}</p>
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>{t('cancel')}</Button>
          <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={handleConfirm} loading={loading}>{t('confirm')}</Button>
        </div>
      </motion.div>
    </div>
  );
};

export const AlertModal = ({ 
  isOpen, 
  title, 
  message, 
  onClose,
  language
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onClose: () => void,
  language: Language
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4"
      >
        <div className="flex items-center gap-3 text-indigo-500">
          <Info size={24} />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400">{message}</p>
        <div className="flex gap-3 mt-2">
          <Button className="flex-1" onClick={onClose}>OK</Button>
        </div>
      </motion.div>
    </div>
  );
};

export const LoadingIndicator = ({ message = "Caricamento..." }: { message?: string }) => (
  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 rounded-full"></div>
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
    </div>
    <p className="mt-4 font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">{message}</p>
  </div>
);

export const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all relative",
      active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
    )}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className={cn("text-[10px] font-bold uppercase tracking-wider", active ? "opacity-100" : "opacity-60")}>{label}</span>
    {active && (
      <motion.div 
        layoutId="activeTab"
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
      />
    )}
  </button>
);
