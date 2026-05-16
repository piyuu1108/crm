<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { 
		ArrowLeft, 
		Clock, 
		Globe, 
		FileText, 
		Timer, 
		MousePointer2, 
		Coffee,
		Activity,
		History,
		ExternalLink,
		AlertCircle,
		Search,
		Layers,
		ArrowUpDown
	} from 'lucide-svelte';

	let { data } = $props();

	let sortKey = $state('totalSeconds');
	let sortDir = $state('desc');

	function formatDuration(seconds: number) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m ${s}s`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}

	function formatDate(date: Date | string | null) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true
		});
	}

	function getEfficiency(active: number, total: number) {
		if (total === 0) return 0;
		return Math.round((active / total) * 100);
	}

	const efficiency = $derived(getEfficiency(data.app.activeSeconds, data.app.totalSeconds));

	const sortedDetails = $derived([...data.details].sort((a, b) => {
		const aVal = a[sortKey as keyof typeof a] ?? 0;
		const bVal = b[sortKey as keyof typeof b] ?? 0;

		if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
		if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
		return 0;
	}));

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'desc';
		}
	}
</script>

<div class="flex flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto">
	<!-- Navigation -->
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="sm" href="/app/students/{data.student.id}/{data.session.id}">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Session Report
		</Button>
	</div>

	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card border rounded-xl p-6 shadow-sm overflow-hidden relative">
		<div class="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
			<Layers class="w-64 h-64 rotate-12" />
		</div>

		<div class="flex items-center gap-6 relative z-10">
			<div>
				<h1 class="text-4xl font-black tracking-tighter uppercase">{data.app.appName}</h1>
				<p class="text-muted-foreground flex items-center gap-2 font-medium">
					<Activity class="h-4 w-4" />
					Deep Activity Analysis
				</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-3 relative z-10">
			<Badge variant="outline" class="bg-background/50 backdrop-blur-sm px-4 py-2 text-sm gap-2 border-primary/20">
				<Clock class="h-4 w-4 text-primary" />
				{formatDuration(data.app.totalSeconds)} Total
			</Badge>
			<Badge variant="outline" class="bg-emerald-500/5 text-emerald-600 px-4 py-2 text-sm gap-2 border-emerald-500/20">
				<MousePointer2 class="h-4 w-4" />
				{formatDuration(data.app.activeSeconds)} Active
			</Badge>
			<Badge variant="outline" class="bg-orange-500/5 text-orange-600 px-4 py-2 text-sm gap-2 border-orange-500/20">
				<Coffee class="h-4 w-4" />
				{formatDuration(data.app.idleSeconds)} Idle
			</Badge>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-12">
		<!-- Left: Timeline & Deep Details -->
		<div class="md:col-span-8 flex flex-col gap-6">
			<!-- Timeline -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<div class="flex items-center gap-2">
						<History class="h-5 w-5 text-primary" />
						<Card.Title>Activity Timeline</Card.Title>
					</div>
					<Badge variant="secondary">{data.segments.length} Segments</Badge>
				</Card.Header>
				<Card.Content>
					{#if data.segments.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed gap-2">
							<Search class="h-10 w-10 opacity-20" />
							<p class="font-medium italic">No detailed timeline segments captured for this app.</p>
						</div>
					{:else}
						<div class="relative pl-6 border-l-2 border-muted py-2 space-y-4">
							{#each data.segments as segment (segment.id)}
								<div class="relative group">
									<div class="absolute left-[-29px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background transition-transform group-hover:scale-125"></div>
									<div class="bg-muted/30 group-hover:bg-muted/50 transition-colors p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
										<div class="flex flex-col gap-1">
											<div class="flex items-center gap-2 text-sm font-semibold">
												<Clock class="h-3 w-3 text-muted-foreground" />
												{formatDate(segment.startedAt)} 
												<span class="text-muted-foreground font-normal">→</span> 
												{formatDate(segment.endedAt)}
											</div>
											{#if segment.detailId}
												<div class="flex items-center gap-2 text-xs text-primary font-medium mt-1">
													<Badge variant="outline" class="text-[10px] uppercase font-bold py-0 h-4 border-primary/20 bg-primary/5">Detail Focus</Badge>
													<span class="truncate max-w-[200px] sm:max-w-md">
														{data.details.find(d => d.id === segment.detailId)?.title || 'Unknown Detail'}
													</span>
												</div>
											{:else}
												<div class="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-1">
													<Badge variant="outline" class="text-[10px] uppercase font-bold py-0 h-4">General App Focus</Badge>
												</div>
											{/if}
										</div>
										<Badge variant="secondary" class="w-fit font-mono">
											{formatDuration(Math.round((new Date(segment.endedAt).getTime() - new Date(segment.startedAt).getTime()) / 1000))}
										</Badge>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Deep Details List -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<div class="flex items-center gap-2">
						<Globe class="h-5 w-5 text-primary" />
						<Card.Title>Browsing & Content Details</Card.Title>
					</div>
					<Badge variant="outline">{data.details.length} Recorded Items</Badge>
				</Card.Header>
				<Card.Content>
					{#if data.details.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed gap-2">
							<AlertCircle class="h-10 w-10 opacity-20" />
							<p class="font-medium italic">No sub-activity or URL details stored for this application.</p>
							<p class="text-xs">Either details gating is ON, or no nested activity occurred.</p>
						</div>
					{:else}
						<div class="rounded-xl border overflow-hidden">
							<Table.Root>
									<Table.Header>
									<Table.Row class="bg-muted/50">
										<Table.Head>
											<button class="flex items-center gap-1 hover:underline w-full justify-start" onclick={() => toggleSort('title')}>
												Activity / Title
												<ArrowUpDown class="size-3 opacity-50" />
											</button>
										</Table.Head>
										<Table.Head>
											<button class="flex items-center gap-1 hover:underline w-full justify-start" onclick={() => toggleSort('domain')}>
												Domain
												<ArrowUpDown class="size-3 opacity-50" />
											</button>
										</Table.Head>
										<Table.Head class="text-right">
											<button class="flex items-center gap-1 hover:underline w-full justify-end" onclick={() => toggleSort('activeSeconds')}>
												Time Spent
												<ArrowUpDown class="size-3 opacity-50" />
											</button>
										</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each sortedDetails as detail (detail.id)}
										<Table.Row class="group">
											<Table.Cell>
												<div class="flex flex-col gap-1">
													<div class="flex items-center gap-2">
														{#if detail.url}
															<Globe class="h-3 w-3 text-primary" />
														{:else}
															<FileText class="h-3 w-3 text-orange-500" />
														{/if}
														<span class="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{detail.title}</span>
													</div>
													{#if detail.url}
														<a href={detail.url} target="_blank" class="text-[10px] text-muted-foreground flex items-center gap-1 hover:underline truncate max-w-md">
															{detail.url}
															<ExternalLink class="h-2 w-2" />
														</a>
													{/if}
												</div>
											</Table.Cell>
											<Table.Cell>
												{#if detail.domain}
													<Badge variant="secondary" class="text-[10px] py-0">{detail.domain}</Badge>
												{:else}
													<span class="text-muted-foreground text-xs italic">N/A</span>
												{/if}
											</Table.Cell>
											<Table.Cell class="text-right">
												<div class="flex flex-col items-end">
													<span class="font-mono font-bold text-emerald-600">{formatDuration(detail.activeSeconds)}</span>
													<span class="text-[10px] text-muted-foreground">Total: {formatDuration(detail.totalSeconds)}</span>
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

		<!-- Right: Efficiency & Summaries -->
		<div class="md:col-span-4 flex flex-col gap-6">
			<Card.Root class="bg-primary text-primary-foreground">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-primary-foreground">
						<Activity class="h-5 w-5" />
						Efficiency Score
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col items-center gap-4">
						<div class="text-6xl font-black">{efficiency}%</div>
						<div class="w-full h-3 rounded-full bg-primary-foreground/20 overflow-hidden">
							<div class="h-full bg-primary-foreground transition-all duration-700" style="width: {efficiency}%"></div>
						</div>
						<p class="text-xs text-primary-foreground/80 text-center font-medium">
							The ratio of active interaction vs total background time for {data.app.appName}.
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Clock class="h-5 w-5 text-orange-500" />
						Summary
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<div class="flex justify-between items-center pb-2 border-b">
							<span class="text-sm text-muted-foreground flex items-center gap-2">
								<Timer class="h-4 w-4" /> Total Focus
							</span>
							<span class="font-bold font-mono">{formatDuration(data.app.totalSeconds)}</span>
						</div>
						<div class="flex justify-between items-center pb-2 border-b">
							<span class="text-sm text-muted-foreground flex items-center gap-2">
								<MousePointer2 class="h-4 w-4" /> Active Work
							</span>
							<span class="font-bold font-mono text-emerald-600">{formatDuration(data.app.activeSeconds)}</span>
						</div>
						<div class="flex justify-between items-center pb-2 border-b text-muted-foreground/60">
							<span class="text-sm flex items-center gap-2">
								<Coffee class="h-4 w-4" /> Idle / Bg
							</span>
							<span class="font-bold font-mono">{formatDuration(data.app.idleSeconds)}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
