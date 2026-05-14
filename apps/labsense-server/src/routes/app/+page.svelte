<script lang="ts">
	import Stats from '$lib/components/dashboard/Stats.svelte';
	import UsageChart from '$lib/components/dashboard/UsageChart.svelte';
	import RecentSessions from '$lib/components/dashboard/RecentSessions.svelte';
	import * as Card from '$lib/components/ui/card';

	let { data } = $props();
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<div class="flex items-center justify-between">
		<h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
	</div>

	<Stats stats={data.stats} />

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
		<div class="md:col-span-2 lg:col-span-4">
			<UsageChart history={data.usageHistory} />
		</div>
		<Card.Root class="md:col-span-2 lg:col-span-3">
			<Card.Header>
				<Card.Title>Recent Sessions</Card.Title>
				<Card.Description>Latest student activity in labs</Card.Description>
			</Card.Header>
			<Card.Content>
				<RecentSessions sessions={data.recentSessions} />
			</Card.Content>
		</Card.Root>
	</div>
</div>
