<script lang="ts">
	interface Props {
		onLinked?: () => void;
	}

	interface PlaidHandler {
		open(): void;
		destroy(): void;
	}

	interface PlaidLinkConfig {
		token: string;
		onSuccess: (public_token: string, metadata: Record<string, unknown>) => void;
		onExit: (err: unknown, metadata: Record<string, unknown>) => void;
		onLoad?: () => void;
	}

	let { onLinked }: Props = $props();

	let loading = $state(false);
	let error = $state('');

	async function openPlaidLink() {
		loading = true;
		error = '';

		let link_token: string;
		try {
			const res = await fetch('/api/plaid/create-link-token', { method: 'POST' });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Failed to create link token');
			link_token = data.link_token;
		} catch (e) {
			error = (e as Error).message;
			loading = false;
			return;
		}

		loading = false;

		// Plaid is loaded as a CDN script in app.html
		const PlaidSDK = (window as unknown as { Plaid: { create(c: PlaidLinkConfig): PlaidHandler } }).Plaid;
		const handler = PlaidSDK.create({
			token: link_token,
			onSuccess: async (public_token: string, metadata: Record<string, unknown>) => {
				const institution = (metadata.institution as Record<string, string>) ?? {};
				try {
					const res = await fetch('/api/plaid/exchange-token', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							public_token,
							institution_name: institution.name ?? 'Unknown Institution',
							institution_id: institution.institution_id ?? '',
						}),
					});
					const data = await res.json();
					if (!res.ok) throw new Error(data.error ?? 'Failed to link bank');
					onLinked?.();
				} catch (e) {
					error = (e as Error).message;
				}
			},
			onExit: (_err: unknown, _metadata: Record<string, unknown>) => {
				loading = false;
			},
		});

		handler.open();
	}
</script>

<button class="link-btn" onclick={openPlaidLink} disabled={loading}>
	{#if loading}
		Connecting…
	{:else}
		+ Link Bank Account
	{/if}
</button>

{#if error}
	<p class="link-error">{error}</p>
{/if}

<style>
	.link-btn {
		background: var(--color-accent, #6366f1);
		color: #fff;
		border: none;
		border-radius: var(--radius-sm, 8px);
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
		width: 100%;
	}

	.link-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.link-error {
		color: var(--color-error, #ef4444);
		font-size: 0.75rem;
		margin-top: 0.4rem;
	}
</style>
