// Automated Test Suite for WATCH OUT v2.2.0 Systems
import { LoanManager } from '../src/simulation/LoanManager.js';
import { DifficultyDirector } from '../src/engine/DifficultyDirector.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('--- WATCH OUT v2.2.0 Verification Suite ---');

// 1. Test LoanManager calculations and limits
const loanMgr = new LoanManager();
assert(loanMgr.creditScore === 720, 'Initial municipal credit score is 720');

const payment = loanMgr.calculateHourlyPayment(15000, 0.045, 24);
assert(payment > 0 && Math.abs(payment - 654) <= 2, `Hourly payment calculation matches expected amortized rate ($${payment}/hr)`);

const loan1 = loanMgr.takeLoan('loan_short_term');
assert(loan1 !== null && loanMgr.activeLoans.length === 1, 'First loan successfully disbursed');
assert(loanMgr.activeLoans[0].remainingPrincipal === 15000, 'Loan remaining principal accurately initialized');

const duplicateAttempt = loanMgr.takeLoan('loan_short_term');
assert(duplicateAttempt === null, 'Disallow concurrent duplicate loans of same tier');

const loan2 = loanMgr.takeLoan('loan_infrastructure');
assert(loan2 !== null && loanMgr.activeLoans.length === 2, 'Second loan successfully disbursed');

const loan3 = loanMgr.takeLoan('loan_strategic_defense');
assert(loan3 === null, 'Maximum concurrent loans limit (2) strictly enforced');

// 2. Test DifficultyDirector adaptive scaling
const director = new DifficultyDirector();
const wave1 = director.composeNextWave(2000, 40, []);
assert(wave1.threatType === 'drone_recon', 'Wave 1 starts with tactical recon probe');

const wave3 = director.composeNextWave(4500, 60, []);
assert(wave3.threatType === 'drone_swarm' || wave3.threatType === 'drone_recon', 'Early waves scale to swarm threats');

const wave10 = director.composeNextWave(6000, 85, [
  { type: 'def_sam_battery', active: true, powered: true },
  { type: 'def_sam_battery', active: true, powered: true },
  { type: 'def_ciws', active: true, powered: true },
  { type: 'mil_airbase', active: true, powered: true }
]);
assert(wave10.speed >= 22, 'Advanced waves spawn high-speed cruise missiles or stealth bombers');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
