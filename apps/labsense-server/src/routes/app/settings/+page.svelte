<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Settings2, Save, AlertTriangle, RefreshCw, Zap, Clock } from 'lucide-svelte';
	import { untrack } from 'svelte';

	let { data, form } = $props();

	let isConfirmOpen = $state(false);
	let isSubmitting = $state(false);
	let values = $state(untrack(() => ({
		syncIntervalSeconds: data.settings.syncIntervalSeconds,
		syncJitterSeconds: data.settings.syncJitterSeconds,
		timeoutSeconds: data.settings.timeoutSeconds,
		idleThresholdSeconds: data.settings.idleThresholdSeconds || 300
	})));

	$effect(() => {
		if (form?.success) {
			toast.success(form.message);
			isConfirmOpen = false;
			isSubmitting = false;
		} else if (form?.message) {
			toast.error(form.message);
			isSubmitting = false;
		}
	});
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-3xl font-bold tracking-tight">System Settings</h2>
			<p class="text-muted-foreground">Configure agent synchronization and session timeouts</p>
		</div>
	</div>

	<div class="max-w-2xl">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Settings2 class="h-5 w-5" />
					Configuration
				</Card.Title>
				<Card.Description>
					Adjust these values to balance data freshness and server load.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="syncInterval" class="flex items-center gap-2">
							<RefreshCw class="h-4 w-4" />
							Sync Interval (seconds)
						</Label>
						<Input
							type="number"
							id="syncInterval"
							bind:value={values.syncIntervalSeconds}
							min="5"
							max="3600"
						/>
						<p class="text-muted-foreground text-xs">How often agents send heartbeat/sync data.</p>
					</div>
					<div class="space-y-2">
						<Label for="syncJitter" class="flex items-center gap-2">
							<Zap class="h-4 w-4" />
							Sync Jitter (seconds)
						</Label>
						<Input
							type="number"
							id="syncJitter"
							bind:value={values.syncJitterSeconds}
							min="0"
							max="600"
						/>
						<p class="text-muted-foreground text-xs">Random delay added to prevent thundering herd.</p>
					</div>
				</div>

				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="timeout" class="flex items-center gap-2">
							<Clock class="h-4 w-4" />
							Session Timeout (seconds)
						</Label>
						<Input
							type="number"
							id="timeout"
							bind:value={values.timeoutSeconds}
							min="30"
							max="36000"
						/>
						<p class="text-muted-foreground text-xs">Time without sync before a session is marked timed out.</p>
					</div>

					<div class="space-y-2">
						<Label for="idleThreshold" class="flex items-center gap-2">
							<Clock class="h-4 w-4" />
							Idle Threshold (seconds)
						</Label>
						<Input
							type="number"
							id="idleThreshold"
							bind:value={values.idleThresholdSeconds}
							min="30"
							max="36000"
						/>
						<p class="text-muted-foreground text-xs">Time after which the agent is considered idle.</p>
					</div>
				</div>
			</Card.Content>
			<Card.Footer class=" bg-muted/20 px-6 py-4">
				<Button class="ml-auto" onclick={() => (isConfirmOpen = true)}>
					<Save class="mr-2 h-4 w-4" />
					Save Changes
				</Button>
			</Card.Footer>
		</Card.Root>
	</div>
</div>

<Dialog.Root bind:open={isConfirmOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<AlertTriangle class="h-5 w-5 text-warning" />
				Security Confirmation
			</Dialog.Title>
			<Dialog.Description>
				Updating system settings requires an additional security password. This is different from your admin password.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateSettings"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
				};
			}}
			class="space-y-4 py-4"
		>
			<input type="hidden" name="syncIntervalSeconds" value={values.syncIntervalSeconds} />
			<input type="hidden" name="syncJitterSeconds" value={values.syncJitterSeconds} />
			<input type="hidden" name="timeoutSeconds" value={values.timeoutSeconds} />
			<input type="hidden" name="idleThresholdSeconds" value={values.idleThresholdSeconds} />

			<div class="space-y-2">
				<Label for="confirmationPassword">Security Password (PASSWD)</Label>
				<Input
					type="password"
					id="confirmationPassword"
					name="confirmationPassword"
					disabled={isSubmitting}
					class={form?.message && !form?.success ? 'border-destructive' : ''}
					required
				/>
				{#if form?.message && !form?.success}
					<p class="text-destructive text-sm font-medium">{form.message}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="ghost"
					onclick={() => (isConfirmOpen = false)}
					disabled={isSubmitting}>Cancel</Button
				>
				<Button type="submit" variant="default" disabled={isSubmitting}>
					{#if isSubmitting}
						<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Confirm & Save
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
