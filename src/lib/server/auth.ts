import { error } from '@sveltejs/kit';
import type { UserRole } from './models/User';

/**
 * Throws a 403 Forbidden error if the current session's role is not in allowedRoles.
 * Use this at the top of any server-side route or load function.
 */
export function requireRole(locals: App.Locals, allowedRoles: UserRole[]): void {
	if (!locals.session || !allowedRoles.includes(locals.session.role as UserRole)) {
		error(403, 'Forbidden');
	}
}
