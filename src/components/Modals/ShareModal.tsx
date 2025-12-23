import React, { useState } from 'react';
import { SharedData, shareService } from '../../services/shareService';

interface ShareModalProps {
  data: SharedData;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ data, onClose }) => {
  const { url, length, isTooLong, payloadLength } = shareService.generateUrl(data);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-xl" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 aura-logo rounded-2xl flex items-center justify-center text-white"><i className="fa-solid fa-share-nodes text-lg"></i></div>
            <div><h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Universal Wave Broadcast</h3><p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Immutable Payload Structure</p></div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-8 pr-2">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Wave Contents</h4>
            {data.t && <div className="flex items-start gap-4"><img src={data.i} className="w-16 h-16 rounded-xl object-cover" alt="" /><div className="flex-1 min-w-0"><p className="text-sm font-extrabold text-zinc-900 dark:text-white mb-1 truncate">{data.t}</p><p className="text-[10px] text-indigo-500 font-bold">{data.st || 'Standalone Broadcast'}</p></div></div>}
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Access Frequency</h4>
            <div className="bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl py-4 px-6 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 break-all leading-relaxed max-h-40 overflow-y-auto">{url}</div>
            <button onClick={handleCopy} className={`w-full py-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-3 ${copied ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl'}`}>
              {copied ? <><i className="fa-solid fa-check"></i> Link Copied</> : <><i className="fa-solid fa-copy"></i> Generate Broadcast URL</>}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-400 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <span>Payload: {payloadLength} bytes</span>
            <span className={isTooLong ? 'text-orange-500' : ''}>Wave: {length} bytes</span>
          </div>
        </div>
        <div className="mt-8 bg-indigo-500/5 dark:bg-indigo-900/10 rounded-2xl p-4 flex gap-4 items-center">
          <i className="fa-solid fa-bolt-lightning text-indigo-500 text-lg"></i>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">This wave uses <b>Deflate compression</b> to embed full track metadata instantly with zero handshake required.</p>
        </div>
      </div>
    </div>
  );
};
