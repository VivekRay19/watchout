export type LoanId = 'loan_short_term' | 'loan_infrastructure' | 'loan_strategic_defense';

export interface LoanDefinition {
  id: LoanId;
  name: string;
  principal: number;
  interestRate: number; // e.g. 0.05 for 5%
  termHours: number; // Duration of loan in in-game hours
  description: string;
  minCreditScore: number;
}

export interface ActiveLoan {
  id: LoanId;
  name: string;
  originalPrincipal: number;
  remainingPrincipal: number;
  hourlyPayment: number;
  termHours: number;
  remainingHours: number;
  totalInterestPaid: number;
}

export const LOAN_CATALOG: Record<LoanId, LoanDefinition> = {
  loan_short_term: {
    id: 'loan_short_term',
    name: 'Short-Term Commercial Line of Credit',
    principal: 15000,
    interestRate: 0.045, // 4.5%
    termHours: 24, // 24 hours
    description: 'Fast working capital for small civic improvements and initial zoning.',
    minCreditScore: 500,
  },
  loan_infrastructure: {
    id: 'loan_infrastructure',
    name: 'Municipal Infrastructure Bond',
    principal: 45000,
    interestRate: 0.065, // 6.5%
    termHours: 48, // 48 hours
    description: 'Medium-term municipal financing for bridges, power generation, and roads.',
    minCreditScore: 600,
  },
  loan_strategic_defense: {
    id: 'loan_strategic_defense',
    name: 'National Strategic Defense Syndicate Loan',
    principal: 100000,
    interestRate: 0.09, // 9.0%
    termHours: 72, // 72 hours
    description: 'Major sovereign defense loan to procure phased-array radar, SAM batteries, and airbase wings.',
    minCreditScore: 650,
  },
};

export class LoanManager {
  public activeLoans: ActiveLoan[] = [];
  public creditScore: number = 720; // 300 to 850
  public totalLoansRepaid: number = 0;
  public totalDefaults: number = 0;

  // Calculates the monthly/hourly amortized payment
  public calculateHourlyPayment(principal: number, interestRate: number, termHours: number): number {
    const totalAmount = principal * (1.0 + interestRate);
    return Math.ceil(totalAmount / termHours);
  }

  public canTakeLoan(loanId: LoanId): { allowed: boolean; reason?: string } {
    const def = LOAN_CATALOG[loanId];
    if (!def) return { allowed: false, reason: 'Invalid loan type.' };

    if (this.creditScore < def.minCreditScore) {
      return {
        allowed: false,
        reason: `Credit score too low (${this.creditScore} vs required ${def.minCreditScore}).`,
      };
    }

    const alreadyActive = this.activeLoans.some((l) => l.id === loanId);
    if (alreadyActive) {
      return { allowed: false, reason: 'You already have an active loan of this tier.' };
    }

    if (this.activeLoans.length >= 2) {
      return { allowed: false, reason: 'Maximum concurrent active loans reached (2).' };
    }

    return { allowed: true };
  }

  public takeLoan(loanId: LoanId): ActiveLoan | null {
    const check = this.canTakeLoan(loanId);
    if (!check.allowed) return null;

    const def = LOAN_CATALOG[loanId];
    const hourlyPayment = this.calculateHourlyPayment(def.principal, def.interestRate, def.termHours);

    const loan: ActiveLoan = {
      id: def.id,
      name: def.name,
      originalPrincipal: def.principal,
      remainingPrincipal: def.principal,
      hourlyPayment,
      termHours: def.termHours,
      remainingHours: def.termHours,
      totalInterestPaid: 0,
    };

    this.activeLoans.push(loan);
    // Slight credit score dip on new debt inquiry
    this.creditScore = Math.max(300, this.creditScore - 15);
    return loan;
  }

  // Returns total hourly debt service across all active loans
  public getTotalHourlyDebtService(): number {
    return this.activeLoans.reduce((sum, l) => sum + l.hourlyPayment, 0);
  }

  // Process loan repayments on economy tick (delta in in-game seconds, 1 hour = 60s in sim)
  public processRepayments(deltaSeconds: number, availableTreasury: number): { deducted: number; defaulted: boolean } {
    let totalDeducted = 0;
    let defaulted = false;

    // Convert sim seconds to hours (assuming 60s = 1 in-game hour)
    const hoursElapsed = deltaSeconds / 60;

    for (let i = this.activeLoans.length - 1; i >= 0; i--) {
      const loan = this.activeLoans[i];
      const paymentDue = loan.hourlyPayment * hoursElapsed;

      if (availableTreasury >= paymentDue) {
        totalDeducted += paymentDue;
        loan.remainingHours -= hoursElapsed;

        // Reduce remaining principal proportionally
        const principalShare = (loan.originalPrincipal / loan.termHours) * hoursElapsed;
        loan.remainingPrincipal = Math.max(0, loan.remainingPrincipal - principalShare);
        loan.totalInterestPaid += paymentDue - principalShare;

        if (loan.remainingHours <= 0 || loan.remainingPrincipal <= 0) {
          this.activeLoans.splice(i, 1);
          this.totalLoansRepaid++;
          this.creditScore = Math.min(850, this.creditScore + 35);
        }
      } else {
        // Missed payment / Default penalty
        defaulted = true;
        this.totalDefaults++;
        this.creditScore = Math.max(300, this.creditScore - 40);
      }
    }

    return { deducted: totalDeducted, defaulted };
  }

  // Early payoff with 0% remaining penalty
  public repayEarly(loanId: LoanId, treasury: number): { success: boolean; amount: number } {
    const idx = this.activeLoans.findIndex((l) => l.id === loanId);
    if (idx === -1) return { success: false, amount: 0 };

    const loan = this.activeLoans[idx];
    const payoffAmount = Math.ceil(loan.remainingPrincipal);

    if (treasury >= payoffAmount) {
      this.activeLoans.splice(idx, 1);
      this.totalLoansRepaid++;
      this.creditScore = Math.min(850, this.creditScore + 25);
      return { success: true, amount: payoffAmount };
    }

    return { success: false, amount: payoffAmount };
  }
}
