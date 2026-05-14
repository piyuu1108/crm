<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Users, Activity, Monitor, Clock } from 'lucide-svelte';

	let { stats } = $props<{
		stats: {
			totalStudents: number;
			activeSessions: number;
			totalMachines: number;
			totalHoursToday: number;
		};
	}>();
</script>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Total Students</Card.Title>
			<Users class="text-muted-foreground h-4 w-4" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{stats.totalStudents}</div>
			<p class="text-muted-foreground text-xs">Registered in system</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Active Sessions</Card.Title>
			<Activity class="h-4 w-4 text-green-500" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{stats.activeSessions}</div>
			<p class="text-muted-foreground text-xs">Currently in labs</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Total Machines</Card.Title>
			<Monitor class="text-muted-foreground h-4 w-4" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{stats.totalMachines}</div>
			<p class="text-muted-foreground text-xs">Connected devices</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<Card.Title class="text-sm font-medium">Lab Hours Today</Card.Title>
			<Clock class="text-muted-foreground h-4 w-4" />
		</Card.Header>
		<Card.Content>
			<div class="text-2xl font-bold">{stats.totalHoursToday}h</div>
			<p class="text-muted-foreground text-xs">Accumulated usage today</p>
		</Card.Content>
	</Card.Root>
</div>
