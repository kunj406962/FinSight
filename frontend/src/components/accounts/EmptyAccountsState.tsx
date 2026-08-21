import { Button } from "../ui/Button";

interface EmptyAccountsStateProps {
  onOpenForm: () => void;
}

export function EmptyAccountsState({ onOpenForm }: EmptyAccountsStateProps) {
  return (
    <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">No accounts registered</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Create an account to start uploading bank statements and tracking transactions.
        </p>
      </div>
      <Button type="button" variant="primary" size="sm" onClick={onOpenForm}>
        Add Your First Account
      </Button>
    </div>
  );
}