// src/components/transactions/TransactionFilterBar.tsx
import { type ChangeEvent } from "react";
import { Input } from "../ui/Input";
import { CATEGORY_OPTIONS } from "../../types/models";

interface Props {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryChange: (val: string) => void;
  monthFilter: string;
  onMonthChange: (val: string) => void;
}

export function TransactionFilterBar({
  searchQuery, onSearchChange, categoryFilter, onCategoryChange, monthFilter, onMonthChange
}: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4 items-start">
      <div className="flex-1">
        <Input 
          label="Search Transactions"
          placeholder="Search descriptions..." 
          value={searchQuery} 
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)} 
        />
      </div>
      
      {/* 
        Inline select styled to match the internal structure of Input.tsx 
        until a formal Select.tsx primitive is built.
      */}
      <div className="w-full md:w-48 space-y-1.5">
        <div className="flex justify-between items-center text-xs font-medium text-slate-300">
          <label>Category</label>
        </div>
        <select
          value={categoryFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onCategoryChange(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-md text-sm font-sans text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700 transition-all duration-150 ease-in-out"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="w-full md:w-48">
        <Input 
          label="Filter by Month"
          type="month" 
          value={monthFilter} 
          onChange={(e: ChangeEvent<HTMLInputElement>) => onMonthChange(e.target.value)} 
        />
      </div>
    </div>
  );
}