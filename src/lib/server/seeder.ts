import bcrypt from 'bcrypt';
import { User } from './models/User';
import { AppSettings } from './models/AppSettings';

const SALT_ROUNDS = 12;

export async function seedDatabase(): Promise<void> {
	const userCount = await User.countDocuments();
	if (userCount > 0) return;

	const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';
	const userPassword = process.env.USER_PASSWORD ?? 'user';
	const adminPin = process.env.ADMIN_PIN;

	const hashes: Promise<string>[] = [
		bcrypt.hash(adminPassword, SALT_ROUNDS),
		bcrypt.hash(userPassword, SALT_ROUNDS)
	];
	if (adminPin) hashes.push(bcrypt.hash(adminPin, SALT_ROUNDS));

	const [adminHash, userHash, adminPinHash] = await Promise.all(hashes);

	await User.create({
		username: 'admin',
		password_hash: adminHash,
		role: 'admin',
		...(adminPinHash ? { admin_pin_hash: adminPinHash } : {})
	});
	await User.create({ username: 'user', password_hash: userHash, role: 'user' });

	const settingsCount = await AppSettings.countDocuments();
	if (settingsCount === 0) {
		await AppSettings.create({ registration_enabled: false, default_theme: 'dark' });
	}
}
