<script lang="ts">
	import {
		type CalcMode,
		getRate,
		computeFromPrice,
		computeFromPayment,
		computeTotalBuydownPool,
		runScenarios,
		formatMoney
	} from '$lib/components/naca';

	let mode: CalcMode = $state('payment');
	let term: 15 | 30 = $state(30);
	let pitiLimit = $state(1584);
	let monthlyTI = $state(320);
	let desiredPayment = $state(1584);
	let desiredPrice = $state(200000);
	let concessionPercent = $state(0);
	let buydownAmt = $state(0);

	let scenarioTerm: 15 | 30 = $state(30);
	let scenarioConcessionPercent = $state(0);
	let scenarioPitiLimit = $state(1584);
	let scenarioBuydown = $state(0);

	let rate = $derived(getRate(term));

	let calcResult = $derived(
		mode === 'payment'
			? computeFromPayment(
				desiredPayment,
				monthlyTI,
				concessionPercent,
				buydownAmt,
				rate,
				term,
				pitiLimit
			)
			: computeFromPrice(
				desiredPrice,
				monthlyTI,
				concessionPercent,
				buydownAmt,
				rate,
				term,
				pitiLimit
			)
	);

	let displayPrice = $derived(mode === 'payment' ? calcResult.price : desiredPrice);
	let poolInfo = $derived(computeTotalBuydownPool(displayPrice, concessionPercent, buydownAmt));
	let isAffordable = $derived(calcResult.piti <= pitiLimit);

	let results = $derived(
		runScenarios({
			pitiLimit: scenarioPitiLimit,
			monthlyTI,
			term: scenarioTerm,
			concessionPercent: scenarioConcessionPercent,
			personalBuydown: scenarioBuydown
		})
	);

	let zillowUrl = $state('');
</script>

<div class="naca-page" data-testid="naca-page">
	<div class="sections-scroll">
		<div class="sections">
			<section class="section glass">
				<h2 class="section-title">Property Lookup</h2>
				<div class="zillow-row">
					<input
						type="text"
						class="zillow-input"
						data-testid="zillow-input"
						placeholder="Paste Zillow / Realtor link..."
						bind:value={zillowUrl}
					/>
					<button
						class="zillow-btn"
						data-testid="zillow-pull-btn"
						disabled
						title="Zillow integration coming soon"
					>
						<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						Pull Info
					</button>
				</div>
				<p class="zillow-hint">UI placeholder only for now. Zillow backend extraction is intentionally disabled.</p>
			</section>

			<section class="section glass">
				<h2 class="section-title">Calculator</h2>

				<div class="mode-toggle" data-testid="naca-mode-toggle">
					<button class:active={mode === 'payment'} onclick={() => (mode = 'payment')}>Target Desired Payment</button>
					<button class:active={mode === 'price'} onclick={() => (mode = 'price')}>Target Purchase Price</button>
				</div>

				<div class="slider-grid">
					{#if mode === 'payment'}
						<label class="slider-field full-width">
							<div class="slider-header">
								<span class="field-label">Desired Monthly Payment</span>
								<input type="number" class="num-input" bind:value={desiredPayment} min="500" max="5000" step="10" />
							</div>
							<input type="range" class="slider" bind:value={desiredPayment} min="500" max="5000" step="10" />
						</label>
					{:else}
						<label class="slider-field full-width">
							<div class="slider-header">
								<span class="field-label">Desired Purchase Price</span>
								<input type="number" class="num-input wide-input" bind:value={desiredPrice} min="50000" max="500000" step="1000" />
							</div>
							<input type="range" class="slider" bind:value={desiredPrice} min="50000" max="500000" step="1000" />
						</label>
					{/if}

					<label class="slider-field">
						<div class="slider-header">
							<span class="field-label">Max PITI (Affordability Limit)</span>
							<input type="number" class="num-input" bind:value={pitiLimit} min="500" max="5000" step="10" />
						</div>
						<input type="range" class="slider" bind:value={pitiLimit} min="500" max="5000" step="10" />
					</label>

					<label class="slider-field">
						<div class="slider-header">
							<span class="field-label">Monthly T&I</span>
							<input type="number" class="num-input" bind:value={monthlyTI} min="0" max="1000" step="10" />
						</div>
						<input type="range" class="slider" bind:value={monthlyTI} min="0" max="1000" step="10" />
					</label>

					<div class="slider-field">
						<div class="slider-header">
							<span class="field-label">Loan Term</span>
						</div>
						<div class="term-toggle">
							<button class:active={term === 15} onclick={() => (term = 15)}>
								<span class="term-label">15-Year</span>
								<span class="term-rate">Base: {getRate(15)}%</span>
							</button>
							<button class:active={term === 30} onclick={() => (term = 30)}>
								<span class="term-label">30-Year</span>
								<span class="term-rate">Base: {getRate(30)}%</span>
							</button>
						</div>
					</div>

					<label class="slider-field">
						<div class="slider-header">
							<span class="field-label">Seller Concession (%)</span>
							<input type="number" class="num-input" bind:value={concessionPercent} min="0" max="10" step="0.5" />
						</div>
						<input type="range" class="slider" bind:value={concessionPercent} min="0" max="10" step="0.5" />
					</label>

					<label class="slider-field full-width">
						<div class="slider-header">
							<span class="field-label gold-label">Personal Rate Buy-Down</span>
							<input type="number" class="num-input gold-input" bind:value={buydownAmt} min="0" max="50000" step="500" />
						</div>
						<input type="range" class="slider gold-slider" bind:value={buydownAmt} min="0" max="50000" step="500" />
					</label>

					{#if poolInfo.totalPool > 0}
						<div class="slider-field full-width buydown-pool">
							<div class="pool-row">
								<span class="field-label gold-label">Total Buydown Pool</span>
								<span class="pool-value">{formatMoney(poolInfo.totalPool)}</span>
							</div>
							<span class="pool-breakdown">
								Personal: {formatMoney(buydownAmt)} + Seller Concession: {formatMoney(poolInfo.concessionDollars)}
							</span>
						</div>
					{/if}
				</div>
			</section>

			<section class="section glass" data-testid="naca-calc-result">
				<div class="summary-bar">
					<div class="summary-item affordability-indicator">
						{#if isAffordable}
							<span class="afford-icon afford-pass">✅</span>
						{:else}
							<span class="afford-icon afford-fail">❌</span>
						{/if}
					</div>
					<div class="summary-item">
						<span class="summary-label">{mode === 'payment' ? 'Desired Payment' : 'Desired Price'}</span>
						<span class="summary-value">{mode === 'payment' ? formatMoney(desiredPayment) : formatMoney(desiredPrice)}</span>
					</div>
					<div class="summary-item">
						<span class="summary-label">Final Rate</span>
						<span class="summary-value teal">{calcResult.finalRate}%</span>
					</div>
					<div class="summary-item">
						<span class="summary-label">{mode === 'payment' ? 'Max Purchase Price' : 'Monthly PITI'}</span>
						<span class="summary-value gold">{mode === 'payment' ? formatMoney(calcResult.price) : formatMoney(calcResult.piti)}</span>
					</div>
					<div class="summary-item">
						<span class="summary-label">PITI Limit</span>
						<span class="summary-value">{formatMoney(pitiLimit)}</span>
					</div>
				</div>
			</section>

			<section class="section glass">
				<h2 class="section-title">Scenarios</h2>

				<div class="scenario-controls">
					<label class="sc-field">
						<span class="sc-label">Max PITI</span>
						<input type="number" class="sc-input" bind:value={scenarioPitiLimit} min="500" max="5000" step="10" />
					</label>
					<label class="sc-field">
						<span class="sc-label">Concession %</span>
						<input type="number" class="sc-input" bind:value={scenarioConcessionPercent} min="0" max="10" step="0.5" />
					</label>
					<label class="sc-field">
						<span class="sc-label">Personal Buydown</span>
						<input type="number" class="sc-input" bind:value={scenarioBuydown} min="0" max="50000" step="500" />
					</label>
					<div class="sc-field sc-term">
						<div class="term-toggle">
							<button class:active={scenarioTerm === 15} onclick={() => (scenarioTerm = 15)}>
								<span class="term-label">15-Year</span>
								<span class="term-rate">Base: {getRate(15)}%</span>
							</button>
							<button class:active={scenarioTerm === 30} onclick={() => (scenarioTerm = 30)}>
								<span class="term-label">30-Year</span>
								<span class="term-rate">Base: {getRate(30)}%</span>
							</button>
						</div>
					</div>
				</div>

				<div class="table-wrap" data-testid="naca-scenarios-table">
					<table class="results-table">
						<thead>
							<tr>
								<th></th>
								<th>Price</th>
								<th>Rate</th>
								<th>P&I</th>
								<th>PITI</th>
							</tr>
						</thead>
						<tbody>
							{#each results as r (r.price)}
								<tr class:row-affordable={r.affordable} class:row-over={!r.affordable}>
									<td>
										{#if r.affordable}
											<span class="check">&#10003;</span>
										{:else}
											<span class="cross">&#10007;</span>
										{/if}
									</td>
									<td>{formatMoney(r.price)}</td>
									<td>{r.finalRate}%</td>
									<td>{formatMoney(r.principalInterest)}</td>
									<td class:affordable={r.affordable} class:over={!r.affordable}>{formatMoney(r.totalPiti)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.naca-page {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.sections-scroll {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--accent-primary-soft, rgba(255, 107, 139, 0.3)) transparent;
	}

	.sections-scroll::-webkit-scrollbar {
		width: 6px;
	}

	.sections-scroll::-webkit-scrollbar-track {
		background: transparent;
	}

	.sections-scroll::-webkit-scrollbar-thumb {
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.3));
		border-radius: 3px;
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
	}

	.section {
		border-radius: var(--radius-md, 12px);
		padding: 1rem 1.2rem;
	}

	.section-title {
		color: var(--accent-primary, #ff6b8b);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin: 0 0 0.75rem 0;
	}

	.zillow-row {
		display: flex;
		gap: 0.5rem;
	}

	.zillow-input {
		flex: 1;
		background: var(--bg-input, rgba(255, 255, 255, 0.88));
		border: 1px solid var(--input-border, rgba(0, 0, 0, 0.14));
		border-radius: 8px;
		color: var(--text-primary, #2d2d3a);
		font-size: 0.8rem;
		padding: 0.5rem 0.75rem;
		outline: none;
	}

	.zillow-input:focus {
		border-color: var(--accent-primary, #ff6b8b);
	}

	.zillow-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		border: 1px solid var(--accent-primary, #ff6b8b);
		color: var(--accent-primary, #ff6b8b);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		cursor: pointer;
		white-space: nowrap;
	}

	.zillow-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.zillow-hint {
		color: var(--text-muted, #888);
		font-size: 0.68rem;
		margin: 0.4rem 0 0 0;
	}

	.mode-toggle {
		display: flex;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	.mode-toggle button {
		flex: 1;
		background: var(--bg-glass, rgba(255, 255, 255, 0.4));
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		color: var(--text-secondary, #666);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.55rem 0.6rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.mode-toggle button.active {
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		border-color: var(--accent-primary, #ff6b8b);
		color: var(--accent-primary, #ff6b8b);
	}

	.slider-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.slider-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.slider-field.full-width {
		grid-column: 1 / -1;
	}

	.slider-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.field-label {
		color: var(--text-secondary, #666);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.gold-label {
		color: var(--accent-secondary, #f5a623);
	}

	.num-input {
		background: var(--bg-input, rgba(255, 255, 255, 0.88));
		border: 1px solid var(--input-border, rgba(0, 0, 0, 0.14));
		border-radius: 6px;
		color: var(--text-primary, #2d2d3a);
		font-size: 0.8rem;
		padding: 0.25rem 0.4rem;
		width: 5.5rem;
		text-align: right;
		outline: none;
	}

	.num-input:focus {
		border-color: var(--accent-primary, #ff6b8b);
	}

	.gold-input {
		border-color: var(--accent-secondary, #f5a623);
		color: var(--accent-secondary, #f5a623);
	}

	.wide-input {
		width: 7rem;
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		background: var(--bg-glass-border, rgba(255, 255, 255, 0.5));
		border-radius: 2px;
		outline: none;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--accent-primary, #ff6b8b);
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--accent-primary, #ff6b8b);
		cursor: pointer;
	}

	.gold-slider::-webkit-slider-thumb {
		background: var(--accent-secondary, #f5a623);
	}

	.gold-slider::-moz-range-thumb {
		background: var(--accent-secondary, #f5a623);
	}

	.term-toggle {
		display: flex;
		gap: 0.3rem;
	}

	.term-toggle button {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		background: var(--bg-glass, rgba(255, 255, 255, 0.4));
		border: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
		color: var(--text-secondary, #666);
		font-size: 0.75rem;
		padding: 0.45rem 0.6rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.term-toggle button.active {
		background: var(--accent-primary-soft, rgba(255, 107, 139, 0.15));
		border-color: var(--accent-primary, #ff6b8b);
		color: var(--accent-primary, #ff6b8b);
	}

	.term-label {
		font-weight: 600;
	}

	.term-rate {
		font-size: 0.6rem;
		opacity: 0.8;
	}

	.buydown-pool {
		background: var(--accent-secondary-soft, rgba(244, 168, 54, 0.12));
		border: 1px solid rgba(244, 168, 54, 0.35);
		border-radius: 8px;
		padding: 0.5rem 0.75rem;
	}

	.pool-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.pool-value {
		color: var(--accent-secondary, #f5a623);
		font-size: 1.1rem;
		font-weight: 700;
	}

	.pool-breakdown {
		color: var(--text-muted, #888);
		font-size: 0.65rem;
		margin-top: 0.2rem;
	}

	.summary-bar {
		display: flex;
		gap: 1.25rem;
		justify-content: center;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		width: 7.2rem;
	}

	.affordability-indicator {
		justify-content: center;
	}

	.afford-icon {
		font-size: 2.4rem;
	}

	.summary-label {
		color: var(--text-secondary, #666);
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.summary-value {
		font-size: 1.28rem;
		font-weight: 500;
		color: var(--text-primary, #2d2d3a);
	}

	.summary-value.gold {
		color: var(--accent-secondary, #f5a623);
	}

	.summary-value.teal {
		color: #00a8a0;
	}

	.scenario-controls {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		margin-bottom: 0.75rem;
	}

	.sc-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.sc-field.sc-term {
		flex: 1;
	}

	.sc-label {
		color: var(--text-secondary, #666);
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.sc-input {
		background: var(--bg-input, rgba(255, 255, 255, 0.88));
		border: 1px solid var(--input-border, rgba(0, 0, 0, 0.14));
		border-radius: 6px;
		color: var(--text-primary, #2d2d3a);
		font-size: 0.8rem;
		padding: 0.25rem 0.4rem;
		width: 5rem;
		text-align: right;
		outline: none;
	}

	.sc-input:focus {
		border-color: var(--accent-primary, #ff6b8b);
	}

	.table-wrap {
		overflow-x: auto;
	}

	.results-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	.results-table th {
		color: var(--text-muted, #a0a0c0);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
		padding: 0.4rem 0.6rem;
		text-align: left;
		border-bottom: 1px solid var(--bg-glass-border, rgba(255, 255, 255, 0.85));
	}

	.results-table td {
		color: var(--text-primary, #2d2d3a);
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid rgba(180, 130, 255, 0.08);
	}

	tr.row-affordable {
		background: rgba(72, 199, 142, 0.08);
	}

	tr.row-over {
		background: rgba(229, 62, 62, 0.06);
	}

	.check {
		color: #2f855a;
		font-weight: 700;
	}

	.cross {
		color: #c53030;
		font-weight: 700;
	}

	.affordable {
		color: #2f855a;
		font-weight: 600;
	}

	.over {
		color: #c53030;
		font-weight: 600;
	}

	@media (max-width: 980px) {
		.slider-grid {
			grid-template-columns: 1fr;
		}

		.summary-bar {
			gap: 0.8rem;
			flex-wrap: wrap;
		}

		.summary-item {
			width: auto;
			min-width: 6.2rem;
		}

		.scenario-controls {
			flex-wrap: wrap;
			gap: 0.7rem;
		}
	}
</style>
