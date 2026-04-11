<script lang="ts">
	let { size = 32 }: { size?: number } = $props();
</script>

<div class="spinner" role="status" aria-label="Loading" style="--size: {size}px">
	<span class="sr-only">Loading…</span>
</div>

<style>
	.spinner {
		position: relative;
		width: var(--size, 32px);
		height: var(--size, 32px);
		border-radius: 50%;
		background: conic-gradient(
			from 0deg,
			var(--accent-primary, #ff6b8b) 0%,
			var(--accent-secondary, #f4a836) 50%,
			transparent 100%
		);
		animation: spin 0.75s linear infinite;
		flex-shrink: 0;
	}

	.spinner::after {
		content: '';
		position: absolute;
		inset: 3px;
		border-radius: 50%;
		background: var(--bg-base, #fafafa);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}
</style>
