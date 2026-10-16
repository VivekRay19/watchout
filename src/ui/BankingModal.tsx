import React from 'react';
import { GameEngine } from '../engine/GameEngine';
import { LOAN_CATALOG, LoanId } from '../simulation/LoanManager';
import { X, Landmark, TrendingUp, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface BankingModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const BankingModal: React.FC<BankingModalProps> = ({ engine, onClose }) => {
  const eco = engine.economy;
  const loanMgr = eco.loanManager;

  const handleTakeLoan = (loanId: LoanId) => {
    const loan = loanMgr.takeLoan(loanId);
    if (loan) {
      eco.addFunds(loan.originalPrincipal);
      soundManager.playPlace();
      engine.log('SUCCESS', `Bank approved and disbursed ${loan.name} for $${loan.originalPrincipal.toLocaleString()}`);
      engine.onStateUpdate?.();
    }
  };

  const handleRepayEarly = (loanId: LoanId) => {
    const res = loanMgr.repayEarly(loanId, eco.state.treasury);
    if (res.success) {
      eco.deductFunds(res.amount);
      soundManager.playPlace();
      engine.log('SUCCESS', `Early loan repayment completed! $${res.amount.toLocaleString()} settled with 0% penalty.`);
      engine.onStateUpdate?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                First Sovereign Bank of Metropolis
              </h2>
              <p className="text-xs text-slate-400">
                Municipal Bond Issuance, Credit Lines & Strategic Capital
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Credit Rating Card */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400 font-medium">Municipal Credit Score</div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{loanMgr.creditScore}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Rating: AAA Sovereign</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Hourly Debt Service</div>
              <div className="text-2xl font-bold text-amber-400 mt-0.5">
                ${loanMgr.getTotalHourlyDebtService().toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Auto-deducted hourly</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Loans Repaid</div>
              <div className="text-2xl font-bold text-sky-400 mt-0.5">{loanMgr.totalLoansRepaid}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{loanMgr.totalDefaults} defaults</div>
            </div>
          </div>

          {/* Active Loans Section */}
          {loanMgr.activeLoans.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                Active Debt Obligations
              </h3>
              <div className="space-y-3">
                {loanMgr.activeLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white text-sm">{loan.name}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-4">
                        <span>Principal Left: ${Math.round(loan.remainingPrincipal).toLocaleString()}</span>
                        <span>Payment: ${loan.hourlyPayment}/hr</span>
                        <span>Remaining: {Math.max(1, Math.round(loan.remainingHours))} hrs</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRepayEarly(loan.id)}
                      disabled={eco.state.treasury < loan.remainingPrincipal}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        eco.state.treasury >= loan.remainingPrincipal
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Repay Early (${Math.round(loan.remainingPrincipal).toLocaleString()})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Loan Catalog */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Available Loan Facilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(LOAN_CATALOG).map((tier) => {
                const check = loanMgr.canTakeLoan(tier.id);
                return (
                  <div
                    key={tier.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{tier.name}</div>
                      <div className="text-2xl font-black text-emerald-400 mt-2">
                        ${tier.principal.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-2 space-y-1">
                        <div>Interest: {(tier.interestRate * 100).toFixed(1)}% Fixed</div>
                        <div>Term: {tier.termHours} in-game hours</div>
                        <div>Min Credit: {tier.minCreditScore}</div>
                      </div>
                      <p className="text-xs text-slate-300 mt-3">{tier.description}</p>
                    </div>

                    <button
                      onClick={() => handleTakeLoan(tier.id)}
                      disabled={!check.allowed}
                      className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition-all ${
                        check.allowed
                          ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {check.allowed ? 'Apply & Disburse' : check.reason || 'Unavailable'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
