<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let { form } = $props();
</script>

<svelte:head>
	<title>Login | Labsense</title>
</svelte:head>

<div class="bg-background flex min-h-screen items-center justify-center px-4 py-12">
	<div
		class="border-border bg-card text-card-foreground w-full max-w-sm space-y-8 rounded-2xl border p-8 shadow-2xl backdrop-blur-xl"
	>
		<div class="space-y-2 text-center">
			<h1 class="text-3xl font-bold tracking-tight">Lab Admin</h1>
			<!-- <p class="text-muted-foreground text-sm">Enter your credentials to access your account</p> -->
		</div>

		<form method="POST" action="?/login" use:enhance class="space-y-6">
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="username">Username</Label>
					<Input id="username" name="username" placeholder="" required class="bg-muted/50" />
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="password">Password</Label>
					</div>
					<Input id="password" name="password" type="password" required class="bg-muted/50" />
				</div>
			</div>

			{#if form?.message}
				<p class="text-destructive text-center text-sm font-medium">{form.message}</p>
			{/if}

			<Button type="submit" class="w-full">Sign in</Button>
		</form>
	</div>
</div>
