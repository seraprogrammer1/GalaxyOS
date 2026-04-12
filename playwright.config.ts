import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
        webServer: {
                command: 'npm run dev',
                port: 5174,
                reuseExistingServer: false,
                env: {
                        MONGODB_URI: 'mongodb://localhost:27017/galaxy_test_db'
                }
        },
        use: {
                baseURL: 'http://localhost:5174'
        },
        testDir: 'tests',
        testMatch: /(.+\.)?(test|spec)\.[jt]s/,
        // Single worker ensures test files run sequentially so that DB
        // seed / teardown hooks in beforeAll / afterAll never race each other.
        workers: 1
};

export default config;
