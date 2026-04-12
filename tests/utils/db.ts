/**
 * Test database utilities for Phase 2.75 E2E test isolation.
 * Connects to the dedicated test database and provides seed/teardown helpers.
 */
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

const MONGODB_URI =
        process.env.MONGODB_URI ?? 'mongodb://localhost:27017/galaxy_test_db';

const SALT_ROUNDS = 10; // Lower cost factor for faster test seeding

// ---------------------------------------------------------------------------
// Minimal schema definition (mirrors the server-side User model)
// ---------------------------------------------------------------------------
const userSchema = new Schema({
        username: { type: String, required: true, unique: true },
        password_hash: { type: String, required: true },
        role: { type: String, default: 'user' },
        admin_pin_hash: { type: String }
});

function getUserModel() {
        return mongoose.models.User ?? mongoose.model('User', userSchema);
}

// ---------------------------------------------------------------------------
// Connection helpers
// ---------------------------------------------------------------------------
async function connectForTest(): Promise<void> {
        if (mongoose.connection.readyState === 0) {
                await mongoose.connect(MONGODB_URI);
        }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Drop the test database, then insert a known set of users that covers:
 *   - "admin"       → used by the auto-login helper in Phase 2.5 tests
 *   - "testadmin"   → admin with a PIN, used in flow-admin.spec.ts
 *   - "testuser"    → standard user, used in flow-user.spec.ts
 */
export async function seedTestUsers(): Promise<void> {
        await connectForTest();
        await mongoose.connection.dropDatabase();

        const [adminHash, testpassHash, adminPinHash] = await Promise.all([
                bcrypt.hash('admin', SALT_ROUNDS),
                bcrypt.hash('testpass', SALT_ROUNDS),
                bcrypt.hash('1234', SALT_ROUNDS)
        ]);

        const User = getUserModel();
        await User.insertMany([
                // Default admin required by the auto-login route (Phase 2.5 tests)
                { username: 'admin', password_hash: adminHash, role: 'admin' },
                // Test-specific admin that goes through the multi-stage PIN flow
                {
                        username: 'testadmin',
                        password_hash: testpassHash,
                        role: 'admin',
                        admin_pin_hash: adminPinHash
                },
                // Test-specific standard user (no PIN flow)
                { username: 'testuser', password_hash: testpassHash, role: 'user' }
        ]);

        await mongoose.disconnect();
}

/**
 * Drop the test database, restore the baseline "admin" user so that Phase 2.5
 * auto-login tests which may run after this cleanup continue to work, then
 * close the connection.
 */
export async function clearTestDB(): Promise<void> {
        await connectForTest();
        await mongoose.connection.dropDatabase();

        // Restore the minimum baseline so the server's auto-login endpoint
        // (used by Phase 2.5 tests) can still find an admin user.
        const adminHash = await bcrypt.hash('admin', SALT_ROUNDS);
        const User = getUserModel();
        await User.create({ username: 'admin', password_hash: adminHash, role: 'admin' });

        await mongoose.disconnect();
}
