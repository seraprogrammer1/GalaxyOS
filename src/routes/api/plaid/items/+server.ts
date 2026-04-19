import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { PlaidItem } from '$lib/server/models/PlaidItem';
import mongoose from 'mongoose';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ error: 'Unauthorized' }, { status: 401 });
	if (locals.session.role !== 'admin') return json({ error: 'Admin access required' }, { status: 403 });

	const owner = new mongoose.Types.ObjectId(locals.session.user_id);
	const items = await PlaidItem.find({ owner }, { access_token: 0 }).lean();

	return json({
		items: items.map((item) => ({
			id: String(item._id),
			item_id: item.item_id,
			institution_name: item.institution_name,
			institution_id: item.institution_id,
			products: item.products
		}))
	});
};
