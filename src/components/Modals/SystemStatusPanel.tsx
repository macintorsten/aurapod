import React, { useState } from 'react';
import { AppError } from '../../types';
import { formatTimestamp } from '../../utils';

interface SystemStatusPanelProps {
  errors: AppError[];
  onClose: () => void;
  onClear: () => void;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({ errors, onClose, onClear }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyTrace = (index: number, error: AppError) => {
    const payload = {
      message: error.message,
      technicalTrace: error.details,
      category: error.category,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950/60 backdrop-blur-xl flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-3xl animate-fade-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-microchip text-xl"></i></div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Diagnostics</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {errors.length === 0 ? (
            <div className="text-center py-20 text-zinc-400 font-medium italic">No signal interruptions detected.</div>
          ) : errors.map((err, i) => (
            <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${err.category === 'playback' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>{err.category}</span>
                <span className="text-[9px] text-zinc-400">{new Date(err.timestamp).toLocaleTimeString()}</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">{err.message}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Technical Trace</p>
                   <button 
                    onClick={() => copyTrace(i, err)} 
                    className={`text-[9px] font-bold transition flex items-center gap-1.5 ${copiedIndex === i ? 'text-green-500' : 'text-indigo-500 hover:text-indigo-400'}`}
                   >
                     <i className={`fa-solid ${copiedIndex === i ? 'fa-check' : 'fa-copy'}`}></i>
                     {copiedIndex === i ? 'Copied to buffer!' : 'Copy for Developer'}
                   </button>
                </div>
                <div className="p-4 bg-black/5 dark:bg-black/40 rounded-xl text-[10px] font-mono text-zinc-500 dark:text-zinc-400 overflow-x-auto whitespace-pre leading-relaxed border border-zinc-200 dark:border-zinc-800/50">
                  {err.details || err.message}
                  {err.context?.diagnostics?.attempts && `\n\nAttempts:\n- ${err.context.diagnostics.attempts.join('\n- ')}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { onClear(); onClose(); }} className="mt-8 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">Clear Activity Log</button>
      </div>
    </div>
  );
};
