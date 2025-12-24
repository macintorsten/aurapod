import React from 'react';
import { Episode } from '../../types';

interface PlayerQueueProps {
  queue: Episode[];
  isOpen: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const PlayerQueue: React.FC<PlayerQueueProps> = ({
  queue,
  isOpen,
  onRemove,
  onClear,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Up Next</h3>
            <p className="text-xs text-zinc-500 mt-1">{queue.length} episodes in queue</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <i className="fa-solid fa-list text-3xl mb-3 block"></i>
              <p className="font-medium">Queue is empty</p>
            </div>
          ) : (
            queue.map((ep, index) => (
              <div
                key={ep.id}
                className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <span className="text-sm font-bold text-zinc-400 w-6">{index + 1}</span>
                <img
                  src={ep.image || ep.podcastImage}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {ep.title}
                  </h4>
                  <p className="text-xs text-zinc-500 truncate">{ep.podcastTitle}</p>
                </div>
                <button
                  onClick={() => onRemove(ep.id)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-red-500 hover:text-white transition flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {queue.length > 0 && (
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onClear}
              className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-red-500 hover:text-white rounded-xl font-bold text-sm transition"
            >
              Clear Queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
