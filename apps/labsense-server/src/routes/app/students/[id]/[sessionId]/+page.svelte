<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { 
		ArrowLeft, 
		Clock, 
		Monitor, 
		Zap, 
		Activity, 
		LogOut, 
		AlertCircle,
		Layout,
		Timer,
		MousePointer2,
		Coffee
	} from 'lucide-svelte';

	let { data } = $props();

	function formatDuration(seconds: number) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m ${s}s`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}

	function getEfficiency(active: number, total: number) {
		if (total === 0) return 0;
		return Math.round((active / total) * 100);
	}

	function formatDate(date: Date | string | null) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleString();
	}

	const efficiency = $derived(getEfficiency(data.session.activeSeconds, data.session.totalSeconds));
</script>

<div class="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
	<!-- Navigation & Title -->
	<div class="flex flex-col gap-4">
		<Button variant="ghost" size="sm" class="w-fit" href="/app/students/{data.student.id}">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to {data.student.name}'s Profile
		</Button>
		
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h2 class="text-3xl font-bold tracking-tight">Session Report</h2>
				<p class="text-muted-foreground">Detailed usage analytics for session {data.session.id.slice(0, 8)}...</p>
			</div>
			<div class="flex items-center gap-2">
				<Badge variant={data.session.status === 'active' ? 'default' : 'outline'} class="px-4 py-1 text-sm capitalize">
					{data.session.status}
				</Badge>
				{#if data.session.endReason}
					<Badge variant="secondary" class="px-4 py-1 text-sm capitalize flex items-center gap-1">
						{#if data.session.endReason === 'logout'}
							<LogOut class="h-3 w-3" />
						{:else}
							<AlertCircle class="h-3 w-3" />
						{/if}
						{data.session.endReason}
					</Badge>
				{/if}
			</div>
		</div>
	</div>

	<!-- Top Stats -->
	<div class="grid gap-4 md:grid-cols-3">
		<Card.Root class="overflow-hidden border-l-4 border-l-primary">
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium flex items-center gap-2">
					<Monitor class="h-4 w-4 text-primary" />
					Machine Context
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.session.machineName || 'Unknown'}</div>
				<p class="text-muted-foreground text-xs mt-1">{data.session.labName || 'System Lab'}</p>
				<div class="mt-2 text-[10px] text-muted-foreground font-mono bg-muted/50 p-1 rounded">
					HWID: {data.session.hardwareId}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="overflow-hidden border-l-4 border-l-orange-500">
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium flex items-center gap-2">
					<Clock class="h-4 w-4 text-orange-500" />
					Timing
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-1">
					<div class="flex justify-between items-center text-sm">
						<span class="text-muted-foreground">Logged In:</span>
						<span class="font-medium">{formatDate(data.session.loginAt)}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span class="text-muted-foreground">Logged Out:</span>
						<span class="font-medium">{data.session.logoutAt ? formatDate(data.session.logoutAt) : 'Still Active'}</span>
					</div>
					<div class="flex justify-between items-center text-sm pt-1 border-t">
						<span class="text-muted-foreground font-semibold">Total Duration:</span>
						<span class="font-bold text-orange-600">{formatDuration(data.session.totalSeconds)}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="overflow-hidden border-l-4 border-l-emerald-500">
			<Card.Header class="pb-2">
				<Card.Title class="text-sm font-medium flex items-center gap-2">
					<Activity class="h-4 w-4 text-emerald-500" />
					Performance
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{efficiency}% <span class="text-sm font-normal text-muted-foreground">Efficiency</span></div>
				<div class="mt-4 h-2 w-full rounded-full bg-secondary">
					<div 
						class="h-2 rounded-full bg-emerald-500 transition-all duration-500" 
						style="width: {efficiency}%"
					></div>
				</div>
				<div class="flex justify-between mt-2 text-[10px] uppercase font-bold tracking-tighter">
					<span class="text-emerald-600">Active: {formatDuration(data.session.activeSeconds)}</span>
					<span class="text-muted-foreground">Idle: {formatDuration(data.session.idleSeconds)}</span>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- App Usage Detailed Report -->
	<div class="grid gap-6 md:grid-cols-1">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<div>
					<Card.Title>Application Usage Detailed Report</Card.Title>
					<Card.Description>Breakdown of focus time and idle time across different software.</Card.Description>
				</div>
				<Layout class="h-5 w-5 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				{#if data.apps.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
						<Zap class="h-12 w-12 opacity-20" />
						<p>No application usage recorded for this session.</p>
					</div>
				{:else}
					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row class="bg-muted/50">
									<Table.Head class="w-[300px]">Application Name</Table.Head>
									<Table.Head>
										<div class="flex items-center gap-1">
											<Timer class="h-3 w-3" />
											Total Time
										</div>
									</Table.Head>
									<Table.Head>
										<div class="flex items-center gap-1">
											<MousePointer2 class="h-3 w-3" />
											Active
										</div>
									</Table.Head>
									<Table.Head>
										<div class="flex items-center gap-1">
											<Coffee class="h-3 w-3" />
											Idle
										</div>
									</Table.Head>
									<Table.Head>Efficiency</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.apps as app}
									<Table.Row>
										<Table.Cell class="font-medium">
											<div class="flex items-center gap-2">
												<div class="h-8 w-8 rounded bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
													{app.appName.charAt(0).toUpperCase()}
												</div>
												{app.appName}
											</div>
										</Table.Cell>
										<Table.Cell>{formatDuration(app.totalSeconds)}</Table.Cell>
										<Table.Cell class="text-emerald-600 font-medium">
											{formatDuration(app.activeSeconds)}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDuration(app.idleSeconds)}
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-2">
												<div class="w-16 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block">
													<div 
														class="h-full bg-primary" 
														style="width: {getEfficiency(app.activeSeconds, app.totalSeconds)}%"
													></div>
												</div>
												<span class="text-xs font-semibold">{getEfficiency(app.activeSeconds, app.totalSeconds)}%</span>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
