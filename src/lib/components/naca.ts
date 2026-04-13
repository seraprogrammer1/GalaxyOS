export type CalcMode = 'payment' | 'price';

export interface NacaInputs {
	pitiLimit: number;
	monthlyTI: number;
	term: 15 | 30;
	concessionPercent: number;
	personalBuydown: number;
}

export const SCENARIO_PRICES = [
	100000,
	150000,
	175000,
	200000,
	210000,
	225000,
	235000,
	250000,
	275000,
	300000
];

export interface NacaResult {
	price: number;
	finalRate: number;
	principalInterest: number;
	totalPiti: number;
	affordable: boolean;
}

const RATES: Record<15 | 30, number> = { 30: 5.5, 15: 5.0 };

export function getRate(term: 15 | 30): number {
	return RATES[term];
}

export function pmt(annualRate: number, termYears: number, principal: number): number {
	const r = annualRate / 100 / 12;
	const n = termYears * 12;
	if (r === 0) return Math.floor((principal / n) * 100) / 100;
	return Math.floor((principal * r) / (1 - Math.pow(1 + r, -n)) * 100) / 100;
}

export function pv(annualRate: number, termYears: number, payment: number): number {
	const r = annualRate / 100 / 12;
	const n = termYears * 12;
	if (r === 0) return payment * n;
	return (payment - Math.pow(1 + r, -n) * payment) / r;
}

export function computeMaxPrice(pitiLimit: number, monthlyTI: number, rate: number, term: number): number {
	const piAvailable = pitiLimit - monthlyTI;
	if (piAvailable <= 0) return 0;
	return Math.round(pv(rate, term, piAvailable));
}

export function computePiti(price: number, monthlyTI: number, rate: number, term: number): number {
	const pi = pmt(rate, term, price);
	return Math.round(pi + monthlyTI);
}

export function buyDownCost(mortgage: number, currentRate: number, targetRate: number, term: 15 | 30): number {
	const factor = term === 15 ? 0.04 : 0.06;
	return Math.round(mortgage * (currentRate - targetRate) * factor);
}

export function buyDownRate(mortgage: number, buyDownAmount: number, baseRate: number, term: 15 | 30): number {
	const factor = term === 15 ? 0.04 : 0.06;
	return Math.round((baseRate - buyDownAmount / factor / mortgage) * 1000) / 1000;
}

export function computeTotalBuydownPool(
	price: number,
	concessionPercent: number,
	personalBuydown: number
): { concessionDollars: number; totalPool: number } {
	const concessionDollars = Math.round((concessionPercent / 100) * price);
	return { concessionDollars, totalPool: personalBuydown + concessionDollars };
}

function pitiAtPrice(
	price: number,
	monthlyTI: number,
	concessionPercent: number,
	personalBuydown: number,
	baseRate: number,
	term: 15 | 30
): { finalRate: number; pi: number; piti: number } {
	if (price <= 0) return { finalRate: baseRate, pi: 0, piti: Math.round(monthlyTI) };
	const { totalPool } = computeTotalBuydownPool(price, concessionPercent, personalBuydown);
	const finalRate = totalPool > 0 ? Math.max(0, buyDownRate(price, totalPool, baseRate, term)) : baseRate;
	const pi = pmt(finalRate, term, price);
	return { finalRate, pi, piti: Math.round(pi + monthlyTI) };
}

export function computeFromPrice(
	price: number,
	monthlyTI: number,
	concessionPercent: number,
	personalBuydown: number,
	baseRate: number,
	term: 15 | 30,
	pitiLimit: number
): { price: number; finalRate: number; pi: number; piti: number; affordable: boolean } {
	const { finalRate, pi, piti } = pitiAtPrice(
		price,
		monthlyTI,
		concessionPercent,
		personalBuydown,
		baseRate,
		term
	);
	return { price, finalRate, pi, piti, affordable: piti <= pitiLimit };
}

export function computeFromPayment(
	desiredPiti: number,
	monthlyTI: number,
	concessionPercent: number,
	personalBuydown: number,
	baseRate: number,
	term: 15 | 30,
	pitiLimit: number
): { price: number; finalRate: number; pi: number; piti: number; affordable: boolean } {
	const piAvailable = desiredPiti - monthlyTI;
	if (piAvailable <= 0) {
		return { price: 0, finalRate: baseRate, pi: 0, piti: Math.round(monthlyTI), affordable: true };
	}

	let lo = 0;
	let hi = Math.round(pv(baseRate, term, piAvailable) * 2) || 1_000_000;

	while (hi - lo > 1) {
		const mid = Math.floor((lo + hi) / 2);
		const { piti } = pitiAtPrice(mid, monthlyTI, concessionPercent, personalBuydown, baseRate, term);
		if (piti <= desiredPiti) {
			lo = mid;
		} else {
			hi = mid;
		}
	}

	const { finalRate, pi, piti } = pitiAtPrice(lo, monthlyTI, concessionPercent, personalBuydown, baseRate, term);
	return { price: lo, finalRate, pi, piti, affordable: piti <= pitiLimit };
}

export function runScenarios(inputs: NacaInputs): NacaResult[] {
	const { pitiLimit, monthlyTI, term, concessionPercent, personalBuydown } = inputs;
	const baseRate = getRate(term);
	const results: NacaResult[] = [];

	for (const price of SCENARIO_PRICES) {
		const { finalRate, pi, piti } = pitiAtPrice(
			price,
			monthlyTI,
			concessionPercent,
			personalBuydown,
			baseRate,
			term
		);

		results.push({
			price,
			finalRate,
			principalInterest: Math.round(pi),
			totalPiti: piti,
			affordable: piti <= pitiLimit
		});
	}

	return results;
}

export function formatMoney(n: number): string {
	return n.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});
}
