
import React from 'react';
import { Identity } from '../types';

interface IdentityCardProps {
  identity: Identity;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const IdentityCard: React.FC<IdentityCardProps> = ({ identity, isActive, onSelect, onDelete }) => {
  return (
    <div 
      onClick={() => onSelect(identity.id)}
      className={`group relative flex flex-col p-3 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
        isActive 
          ? 'bg-blue-600/10 border-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
          : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
      }`}
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3">
        <img 
          src={identity.imageUrl} 
          alt={identity.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {isActive && (
          <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
            <i className="fa-solid fa-check-circle text-2xl text-orange-500 drop-shadow-md"></i>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-xs font-bold text-white truncate">{identity.name}</span>
        <div className="flex items-center space-x-1 mt-1">
          <div className={`w-1.5 h-1.5 rounded-full ${identity.embeddingStatus === 'ready' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-[10px] text-slate-400 capitalize">{identity.embeddingStatus}</span>
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(identity.id); }}
        className="absolute top-2 right-2 p-1.5 bg-slate-900/60 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all"
      >
        <i className="fa-solid fa-trash text-[10px] text-white"></i>
      </button>
    </div>
  );
};

export default IdentityCard;
