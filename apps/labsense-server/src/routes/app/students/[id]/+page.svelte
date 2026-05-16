<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { 
		MoreVertical, 
		User, 
		Clock, 
		Monitor, 
		Activity, 
		History,
		Trash2,
		Edit,
		Zap,
		Shield,
		RefreshCw,
		Filter,
		RotateCcw
	} from 'lucide-svelte';

	let { data, form } = $props();

	let isEditOpen = $state(false);
	let isDeleteOpen = $state(false);
	let isSubmitting = $state(false);

	let fromDate = $state('');
	let toDate = $state('');

	$effect(() => {
		fromDate = data.from || '';
		toDate = data.to || '';
	});

	function applyFilters() {
		const url = new URL(window.location.href);
		if (fromDate) url.searchParams.set('from', fromDate);
		else url.searchParams.delete('from');
		
		if (toDate) url.searchParams.set('to', toDate);
		else url.searchParams.delete('to');
		
		window.location.href = url.toString();
	}

	function clearFilters() {
		const url = new URL(window.location.href);
		url.searchParams.delete('from');
		url.searchParams.delete('to');
		window.location.href = url.toString();
	}

	function formatDuration(seconds: number) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		return `${h}h ${m}m`;
	}

	function getEfficiency(active: number, total: number) {
		if (total === 0) return 0;
		return Math.round((active / total) * 100);
	}

	$effect(() => {
		if (form?.success) {
			toast.success(form.message);
			isEditOpen = false;
			isDeleteOpen = false;
			isSubmitting = false;
		} else if (form?.message) {
			toast.error(form.message);
			isSubmitting = false;
		}
	});
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
				<User class="h-6 w-6" />
			</div>
			<div>
				<h2 class="text-3xl font-bold tracking-tight">{data.student.name}</h2>
				<p class="text-muted-foreground flex items-center gap-2">
					<Badge variant="secondary">{data.student.id}</Badge>
					<span class="text-xs">Student Profile</span>
				</p>
			</div>
		</div>

		<DropdownMenu.Root>
			<DropdownMenuPrimitive.Trigger asChild>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon">
						<MoreVertical class="h-5 w-5" />
					</Button>
				{/snippet}
			</DropdownMenuPrimitive.Trigger>
			<DropdownMenu.Content align="end" class="w-48">
				<DropdownMenu.Item onclick={() => (isEditOpen = true)}>
					<Edit class="mr-2 h-4 w-4" />
					Edit Profile
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => (isDeleteOpen = true)} class="text-destructive">
					<Trash2 class="mr-2 h-4 w-4" />
					Delete Student
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<!-- Stats Dashboard -->
	<div class="grid gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium">Total Usage</Card.Title>
				<Clock class="text-muted-foreground h-4 w-4" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{formatDuration(data.stats.totalSeconds)}</div>
				<p class="text-muted-foreground text-xs">Across {data.stats.totalSessions} sessions</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium">Activity Rate</Card.Title>
				<Activity class="text-muted-foreground h-4 w-4" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{getEfficiency(data.stats.activeSeconds, data.stats.totalSeconds)}%</div>
				<div class="mt-2 h-2 w-full rounded-full bg-secondary">
					<div 
						class="h-2 rounded-full bg-primary" 
						style="width: {getEfficiency(data.stats.activeSeconds, data.stats.totalSeconds)}%"
					></div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium">Active Time</Card.Title>
				<Zap class="text-primary h-4 w-4" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{formatDuration(data.stats.activeSeconds)}</div>
				<p class="text-muted-foreground text-xs">Productive work time</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between pb-2">
				<Card.Title class="text-sm font-medium">Total Sessions</Card.Title>
				<History class="text-muted-foreground h-4 w-4" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.totalSessions}</div>
				<p class="text-muted-foreground text-xs">Lab visits recorded</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Sessions Table -->
	<div class="space-y-4">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<h3 class="text-xl font-semibold">Session History</h3>
			<div class="flex items-center gap-2">
				<div class="flex items-center gap-2">
					<Label for="from" class="text-xs">From</Label>
					<Input type="date" id="from" bind:value={fromDate} class="h-8 w-[140px] text-xs" />
				</div>
				<div class="flex items-center gap-2">
					<Label for="to" class="text-xs">To</Label>
					<Input type="date" id="to" bind:value={toDate} class="h-8 w-[140px] text-xs" />
				</div>
				<Button size="sm" variant="outline" onclick={applyFilters} class="h-8">
					<Filter class="mr-2 h-3.5 w-3.5" />
					Filter
				</Button>
				{#if data.from || data.to}
					<Button size="sm" variant="ghost" onclick={clearFilters} class="h-8 text-muted-foreground">
						<RotateCcw class="mr-2 h-3.5 w-3.5" />
						Clear
					</Button>
				{/if}
			</div>
		</div>
		
		<div class="rounded-md border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Date</Table.Head>
						<Table.Head>Machine</Table.Head>
						<Table.Head>Duration</Table.Head>
						<Table.Head>Active %</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.sessions.length === 0}
						<Table.Row>
							<Table.Cell colspan={5} class="text-center py-8 text-muted-foreground">
								No sessions found for this period
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.sessions as session (session.id)}
							<Table.Row class="group cursor-pointer hover:bg-muted/50" onclick={() => window.location.href = `/app/students/${data.student.id}/${session.id}`}>
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-medium">{new Date(session.loginAt).toLocaleDateString()}</span>
										<span class="text-muted-foreground text-xs">
											{new Date(session.loginAt).toLocaleTimeString()} - 
											{session.logoutAt ? new Date(session.logoutAt).toLocaleTimeString() : 'Active'}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Monitor class="h-4 w-4 text-muted-foreground" />
										{session.machineName || 'Unknown'}
									</div>
								</Table.Cell>
								<Table.Cell>{formatDuration(session.totalSeconds)}</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<div class="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
											<div 
												class="h-full bg-primary" 
												style="width: {getEfficiency(session.activeSeconds, session.totalSeconds)}%"
											></div>
										</div>
										<span class="text-xs">{getEfficiency(session.activeSeconds, session.totalSeconds)}%</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center justify-between gap-2">
										<Badge variant={session.status === 'active' ? 'default' : 'outline'} class="capitalize">
											{session.status}
										</Badge>
										<Button variant="ghost" size="sm" class="opacity-0 group-hover:opacity-100 h-8 px-2 transition-opacity">
											<Zap class="h-3.5 w-3.5 mr-1" />
											View Report
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
</div>

<!-- Edit Dialog -->
<Dialog.Root bind:open={isEditOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Student Profile</Dialog.Title>
			<Dialog.Description>
				Update account details for <strong>{data.student.id}</strong>.
			</Dialog.Description>
		</Dialog.Header>
		<form 
			method="POST" 
			action="?/editStudent" 
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => await update();
			}} 
			class="space-y-4 py-4"
		>
			<div class="space-y-2">
				<Label for="edit-name">Full Name</Label>
				<Input id="edit-name" name="name" value={data.student.name} required />
			</div>
			<div class="space-y-2 border-t pt-4">
				<Label for="edit-password">New Student Password (optional)</Label>
				<Input type="password" id="edit-password" name="password" placeholder="Leave blank to keep current" />
			</div>
			
			<div class="space-y-2 border-t pt-4 bg-muted/20 p-4 rounded-lg">
				<Label for="edit-admin-password" class="text-primary flex items-center gap-2">
					<Shield class="h-4 w-4" />
					Current Admin Password
				</Label>
				<Input type="password" id="edit-admin-password" name="adminPassword" placeholder="Required to save changes" required />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (isEditOpen = false)} disabled={isSubmitting}>Cancel</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save Changes
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Dialog -->
<Dialog.Root bind:open={isDeleteOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="text-destructive flex items-center gap-2">
				<Trash2 class="h-5 w-5" />
				Delete Student Account
			</Dialog.Title>
			<Dialog.Description>
				This will permanently delete the account for <strong>{data.student.name}</strong> and all associated session history. This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<form 
			method="POST" 
			action="?/deleteStudent" 
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => await update();
			}} 
			class="space-y-4 py-4"
		>
			<div class="space-y-2 bg-muted/20 p-4 rounded-lg">
				<Label for="delete-admin-password" class="text-primary flex items-center gap-2">
					<Shield class="h-4 w-4" />
					Current Admin Password
				</Label>
				<Input type="password" id="delete-admin-password" name="adminPassword" placeholder="Required to confirm deletion" required />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (isDeleteOpen = false)} disabled={isSubmitting}>Cancel</Button>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}
						<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
						Deleting...
					{:else}
						Permanently Delete
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
