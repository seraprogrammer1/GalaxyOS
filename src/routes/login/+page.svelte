<script lang="ts">
        import type { PageData } from './$types';

        let { data }: { data: PageData } = $props();

        let username = $state('');
        let password = $state('');
        let pin = $state('');
        let error = $state('');
        // Set to true after a successful login response with role === 'pending_pin'.
        // Causes the PIN verification form to replace the credential form.
        let pendingPin = $state(false);

        async function handleLogin(e: SubmitEvent) {
                e.preventDefault();
                error = '';
                const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                });
                if (res.ok) {
                        const body = await res.json().catch(() => ({}));
                        if (body.role === 'pending_pin') {
                                // Multi-stage admin flow: show PIN verification form
                                pendingPin = true;
                        } else {
                                window.location.href = '/dashboard';
                        }
                } else {
                        const body = await res.json().catch(() => ({}));
                        error = body.error ?? 'Login failed';
                }
        }

        async function handlePin(e: SubmitEvent) {
                e.preventDefault();
                error = '';
                const res = await fetch('/api/auth/pin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin })
                });
                if (res.ok) {
                        window.location.href = '/dashboard';
                } else {
                        const body = await res.json().catch(() => ({}));
                        error = body.error ?? 'PIN incorrect';
                }
        }
</script>

<main>
        <h1>Galaxy OS</h1>

        {#if error}
                <p role="alert" class="error">{error}</p>
        {/if}

        {#if pendingPin}
                <!-- Multi-stage admin login: credentials accepted, PIN verification required -->
                <section aria-label="Admin PIN verification">
                        <h2>Verify Admin PIN</h2>
                        <form onsubmit={handlePin}>
                                <label>
                                        PIN
                                        <input type="password" bind:value={pin} autocomplete="one-time-code" required />
                                </label>
                                <button type="submit">Verify</button>
                        </form>
                </section>
        {:else if data.isLocal && data.autoLoginFailed}
                <!-- Local network: auto-login failed, offer direct PIN entry -->
                <section aria-label="PIN login">
                        <h2>Admin PIN</h2>
                        <form onsubmit={handlePin}>
                                <label>
                                        PIN
                                        <input type="password" bind:value={pin} required />
                                </label>
                                <button type="submit">Enter</button>
                        </form>
                </section>
        {:else if !data.isLocal}
                <!-- External network: show full username/password form -->
                <section aria-label="Username and password login">
                        <h2>Sign In</h2>
                        <form onsubmit={handleLogin}>
                                <label>
                                        Username
                                        <input type="text" bind:value={username} required />
                                </label>
                                <label>
                                        Password
                                        <input type="password" bind:value={password} required />
                                </label>
                                <button type="submit">Login</button>
                        </form>
                </section>
        {/if}
</main>

<style>
        main {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 2rem;
        }

        .error {
                color: red;
        }

        form {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                min-width: 260px;
        }

        label {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
        }
</style>