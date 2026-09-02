// src/components/transactions/TransactionFilterBar.tsx
import { type ChangeEvent } from "react";
import { Input } from "../ui/Input";
import { CATEGORY_OPTIONS } from "../../types/models";

interface AccountOption {
  id: string;
  name: string;
}

interface Props {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryChange: (val: string) => void;
  monthFilter: string;
  onMonthChange: (val: string) => void;
  // Optional account filter -- only rendered when `accounts` is provided.
  // AccountDetail doesn't pass this (its transactions are already scoped
  // to one account); the global Transactions page does.
  accounts?: AccountOption[];
  accountFilter?: string;
  onAccountChange?: (val: string) => void;
}

export function TransactionFilterBar({
  searchQuery, onSearchChange, categoryFilter, onCategoryChange, monthFilter, onMonthChange,
  accounts, accountFilter, onAccountChange,
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

      {accounts && onAccountChange && (
        <div className="w-full md:w-48 space-y-1.5">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <label htmlFor="account-filter">Account</label>
          </div>
          <select
            id="account-filter"
            value={accountFilter ?? ""}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onAccountChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-md text-sm font-sans text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700 transition-all duration-150 ease-in-out"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* 
        Inline select styled to match the internal structure of Input.tsx 
        until a formal Select.tsx primitive is built.
      */}
      <div className="w-full md:w-48 space-y-1.5">
        <div className="flex justify-between items-center text-xs font-medium text-slate-300">
          <label htmlFor="category-filter">Category</label>
        </div>
        <select
          id="category-filter"
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