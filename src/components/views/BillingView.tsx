import React from 'react';
import { CreditCard, Info } from 'lucide-react';

interface BillingViewProps {
  themeMode: 'dark' | 'light';
  onNavigateToAi?: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ themeMode }) => {
  const isLight = themeMode === 'light';
  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-500" />
          <h1 className="text-xl font-bold">Billing & Cost</h1>
        </div>
        <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Billing values are shown only after a real billing or infrastructure provider is connected.
        </p>
      </div>
      <div className={`rounded-xl border p-6 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800'}`}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-500 mt-0.5" />
          <div>
            <h2 className="font-semibold">No billing provider configured</h2>
            <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              NovaCloud will not fabricate spend, invoices, savings, or cost projections. Connect a supported provider before enabling billing analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
