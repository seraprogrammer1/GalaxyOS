<script lang="ts">
	let {
		width = '100%',
		height = '1rem',
		rounded = false
	}: { width?: string; height?: string; rounded?: boolean } = $props();
</script>

<div
	class="skeleton {rounded ? 'rounded' : ''}"
	style="width: {width}; height: {height}"
	aria-hidden="true"
></div>

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			var(--accent-primary-soft, rgba(255, 107, 139, 0.1)) 25%,
			rgba(180, 160, 220, 0.25) 50%,
			var(--accent-secondary-soft, rgba(244, 168, 54, 0.1)) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.6s ease-in-out infinite;
		border-radius: var(--radius-sm, 8px);
	}

	.skeleton.rounded {
		border-radius: 999px;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
