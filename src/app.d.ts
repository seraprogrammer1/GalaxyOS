// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: { id: string; username: string; role: string } | null;
			session: {
				token: string;
				user_id?: string;
				role: string;
				ip_type: 'local' | 'external';
				expires_at: Date;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
