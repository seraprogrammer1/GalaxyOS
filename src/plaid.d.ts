// Plaid Link SDK — loaded via CDN script in app.html
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

declare const Plaid: {
	create(config: PlaidLinkConfig): PlaidHandler;
};
