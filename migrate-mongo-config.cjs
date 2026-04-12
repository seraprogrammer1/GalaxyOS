/**
 * migrate-mongo configuration.
 *
 * Used by the migrate-mongo CLI for manual migration operations:
 *   npx migrate-mongo --config migrate-mongo-config.cjs up
 *   npx migrate-mongo --config migrate-mongo-config.cjs down
 *   npx migrate-mongo --config migrate-mongo-config.cjs status
 *
 * The authoritative programmatic runner is src/lib/server/migrationRunner.ts,
 * which is called automatically at server startup via hooks.server.ts.
 *
 * NOTE: This file uses CommonJS syntax (.cjs) because migrate-mongo v14 CLI
 * does not support ESM config files in projects with "type": "module".
 */
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
	mongodb: {
		url: process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxy_db',
		options: {}
	},
	migrationsDir: 'migrations-cli',
	changelogCollectionName: '__migrations',
	migrationFileExtension: '.js',
	useFileHash: false,
	moduleSystem: 'commonjs'
};
