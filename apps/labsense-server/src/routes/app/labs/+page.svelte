<script lang="ts">
	import LabsTable from '$lib/components/labs/LabsTable.svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Search } from 'lucide-svelte';
	import type { LabMachine } from '$lib/types/labs';

	let { data } = $props();

	let searchQuery = $state('');
	let selectedLab = $state('all');

	$effect(() => {
		searchQuery = data.search;
		selectedLab = data.lab || 'all';
	});

	function updateFilters() {
		const params = new URLSearchParams(page.url.searchParams);
		if (searchQuery) params.set('search', searchQuery);
		else params.delete('search');

		if (selectedLab !== 'all') params.set('lab', selectedLab);
		else params.delete('lab');

		goto(`?${params.toString()}`, { keepFocus: true, noScroll: true });
	}

	let timeout: any;
	function handleSearch() {
		clearTimeout(timeout);
		timeout = setTimeout(updateFilters, 300);
	}
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h2 class="text-3xl font-bold tracking-tight">Labs Management</h2>
			<p class="text-muted-foreground">Monitor machines and student activity across all labs</p>
		</div>
	</div>

	<div class="flex flex-col gap-4 md:flex-row md:items-center">
		<div class="relative flex-1">
			<Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
			<Input
				placeholder="Search PC name or Hardware ID..."
				class="pl-10"
				bind:value={searchQuery}
				oninput={handleSearch}
			/>
		</div>
		<div class="w-full md:w-[200px]">
			<Select.Root
				type="single"
				bind:value={selectedLab}
				onValueChange={updateFilters}
			>
				<Select.Trigger>
					{selectedLab === 'all' ? 'All Labs' : selectedLab}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all">All Labs</Select.Item>
					{#each data.labs as lab}
						<Select.Item value={lab}>{lab}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<LabsTable machines={data.machines} />
</div>
