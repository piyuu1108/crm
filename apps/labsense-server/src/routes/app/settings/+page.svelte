<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { 
		Settings2, 
		Save, 
		AlertTriangle, 
		RefreshCw, 
		Zap, 
		Clock, 
		Activity, 
		Layers, 
		MousePointer2, 
		History,
		Database
	} from 'lucide-svelte';
	import { untrack } from 'svelte';

	let { data, form } = $props();

	let isConfirmOpen = $state(false);
	let isSubmitting = $state(false);
	let values = $state(untrack(() => ({
		syncIntervalSeconds: data.settings.syncIntervalSeconds,
		syncJitterSeconds: data.settings.syncJitterSeconds,
		timeoutSeconds: data.settings.timeoutSeconds,
		idleThresholdSeconds: data.settings.idleThresholdSeconds || 120,
		enableDetails: data.settings.enableDetails ?? true,
		enableSegments: data.settings.enableSegments ?? true,
		maxSegmentsPerApp: data.settings.maxSegmentsPerApp || 50,
		maxSegmentsPerDetail: data.settings.maxSegmentsPerDetail || 20,
		maxDetailsPerApp: data.settings.maxDetailsPerApp || 50,
		minimumTrackedSeconds: data.settings.minimumTrackedSeconds || 15,
		candidateRetentionMinutes: data.settings.candidateRetentionMinutes || 10
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
			<p class="text-muted-foreground">Configure agent synchronization, analytics granularity, and retention policies</p>
		</div>
	</div>

	<div class="max-w-3xl">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Settings2 class="h-5 w-5" />
					Global Configuration
				</Card.Title>
				<Card.Description>
					Adjust these values to balance data freshness and server load.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-8">
				<!-- Section: Sync & Timing -->
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<Activity class="h-4 w-4 text-primary" />
						<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sync & Timing</h3>
					</div>
					<div class="grid gap-6 md:grid-cols-2">
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
								<MousePointer2 class="h-4 w-4" />
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
				</div>

				<Separator />

				<!-- Section: Analytics Gating -->
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<Layers class="h-4 w-4 text-primary" />
						<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Analytics Gating</h3>
					</div>
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-2">
							<Label class="flex items-center gap-2">
								<Activity class="h-4 w-4" />
								Enable Detailed Tracking
							</Label>
							<Select.Root
								type="single"
								value={values.enableDetails.toString()}
								onValueChange={(v) => (values.enableDetails = v === 'true')}
							>
								<Select.Trigger class="w-full">
									{values.enableDetails ? 'Enabled' : 'Disabled'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="true">Enabled</Select.Item>
									<Select.Item value="false">Disabled</Select.Item>
								</Select.Content>
							</Select.Root>
							<p class="text-muted-foreground text-xs">Track page titles, domains, and URLs.</p>
						</div>
						<div class="space-y-2">
							<Label class="flex items-center gap-2">
								<History class="h-4 w-4" />
								Enable Timeline Segments
							</Label>
							<Select.Root
								type="single"
								value={values.enableSegments.toString()}
								onValueChange={(v) => (values.enableSegments = v === 'true')}
							>
								<Select.Trigger class="w-full">
									{values.enableSegments ? 'Enabled' : 'Disabled'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="true">Enabled</Select.Item>
									<Select.Item value="false">Disabled</Select.Item>
								</Select.Content>
							</Select.Root>
							<p class="text-muted-foreground text-xs">Track high-resolution activity timeline segments.</p>
						</div>
					</div>
				</div>

				<Separator />

				<!-- Section: Bounded Memory & Limits -->
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<Database class="h-4 w-4 text-primary" />
						<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Memory & Limits</h3>
					</div>
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="maxSegmentsPerApp" class="flex items-center gap-2">
								Max Segments / App
							</Label>
							<Input
								type="number"
								id="maxSegmentsPerApp"
								bind:value={values.maxSegmentsPerApp}
								min="1"
								max="500"
							/>
							<p class="text-muted-foreground text-xs">Max timeline segments stored per top-level application.</p>
						</div>
						<div class="space-y-2">
							<Label for="maxSegmentsPerDetail" class="flex items-center gap-2">
								Max Segments / Detail
							</Label>
							<Input
								type="number"
								id="maxSegmentsPerDetail"
								bind:value={values.maxSegmentsPerDetail}
								min="1"
								max="200"
							/>
							<p class="text-muted-foreground text-xs">Max timeline segments stored per nested detail/page.</p>
						</div>
						<div class="space-y-2">
							<Label for="maxDetailsPerApp" class="flex items-center gap-2">
								Max Details / App
							</Label>
							<Input
								type="number"
								id="maxDetailsPerApp"
								bind:value={values.maxDetailsPerApp}
								min="1"
								max="500"
							/>
							<p class="text-muted-foreground text-xs">Max sub-activities (pages/files) stored per application.</p>
						</div>
						<div class="space-y-2">
							<Label for="minimumTrackedSeconds" class="flex items-center gap-2">
								Min Tracked Activity (seconds)
							</Label>
							<Input
								type="number"
								id="minimumTrackedSeconds"
								bind:value={values.minimumTrackedSeconds}
								min="0"
								max="300"
							/>
							<p class="text-muted-foreground text-xs">Discard transient activities shorter than this duration.</p>
						</div>
						<div class="space-y-2">
							<Label for="candidateRetentionMinutes" class="flex items-center gap-2">
								Candidate Retention (minutes)
							</Label>
							<Input
								type="number"
								id="candidateRetentionMinutes"
								bind:value={values.candidateRetentionMinutes}
								min="1"
								max="1440"
							/>
							<p class="text-muted-foreground text-xs">How long to keep unconfirmed activities in memory.</p>
						</div>
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
				Updating system settings requires an additional security password (PASSWD).
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
			<input type="hidden" name="enableDetails" value={values.enableDetails.toString()} />
			<input type="hidden" name="enableSegments" value={values.enableSegments.toString()} />
			<input type="hidden" name="maxSegmentsPerApp" value={values.maxSegmentsPerApp} />
			<input type="hidden" name="maxSegmentsPerDetail" value={values.maxSegmentsPerDetail} />
			<input type="hidden" name="maxDetailsPerApp" value={values.maxDetailsPerApp} />
			<input type="hidden" name="minimumTrackedSeconds" value={values.minimumTrackedSeconds} />
			<input type="hidden" name="candidateRetentionMinutes" value={values.candidateRetentionMinutes} />

			<div class="space-y-2">
				<Label for="confirmationPassword">Security Password</Label>
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
