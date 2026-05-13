<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { formatDuration, formatDateTime } from '$lib/utils/format';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import UsersIcon from '@lucide/svelte/icons/users';

	let { data } = $props();

	let searchInput = $state(data.search);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleSearch(value: string) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const url = new URL($page.url);
			if (value) {
				url.searchParams.set('q', value);
			} else {
				url.searchParams.delete('q');
			}
			url.searchParams.set('page', '1');
			goto(url.toString(), { replaceState: true, keepFocus: true });
		}, 300);
	}

	function handleSort(column: string) {
		const url = new URL($page.url);
		const currentSort = url.searchParams.get('sort');
		const currentDir = url.searchParams.get('dir') || 'desc';

		url.searchParams.set('sort', column);
		url.searchParams.set(
			'dir',
			currentSort === column && currentDir === 'desc' ? 'asc' : 'desc'
		);
		url.searchParams.set('page', '1');
		goto(url.toString(), { replaceState: true });
	}

	function handlePage(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(newPage));
		goto(url.toString(), { replaceState: true });
	}

	const totalPages = $derived(Math.ceil(data.totalCount / data.perPage));
</script>

<svelte:head>
	<title>Students | LabSense</title>
</svelte:head>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Students</h2>
			<p class="text-muted-foreground text-sm">{data.totalCount} total students</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" href="/app/students/add">Add Student</Button>
			<Button variant="outline" href="/app/students/bulk">Bulk Import</Button>
		</div>
	</div>

	<!-- Search -->
	<div class="relative max-w-sm">
		<SearchIcon class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
		<Input
			placeholder="Search by ID or name..."
			class="pl-9"
			value={searchInput}
			oninput={(e) => {
				const target = e.currentTarget as HTMLInputElement;
				searchInput = target.value;
				handleSearch(target.value);
			}}
		/>
	</div>

	<!-- Table -->
	{#if data.students.length === 0}
		<div class="border-border bg-muted/30 flex flex-col items-center justify-center rounded-lg border py-16">
			<UsersIcon class="text-muted-foreground mb-4 size-12" />
			<h3 class="text-lg font-semibold">No students found</h3>
			<p class="text-muted-foreground text-sm">
				{#if data.search}
					No results for "{data.search}". Try a different search.
				{:else}
					Get started by adding your first student.
				{/if}
			</p>
		</div>
	{:else}
		<div class="rounded-md border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Student ID</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>
							<button class="flex items-center gap-1 hover:underline" onclick={() => handleSort('totalLab')}>
								Total Lab Time
								<ArrowUpDownIcon class="size-3" />
							</button>
						</Table.Head>
						<Table.Head>
							<button class="flex items-center gap-1 hover:underline" onclick={() => handleSort('totalActive')}>
								Total Active Time
								<ArrowUpDownIcon class="size-3" />
							</button>
						</Table.Head>
						<Table.Head>Total Free Time</Table.Head>
						<Table.Head>
							<button class="flex items-center gap-1 hover:underline" onclick={() => handleSort('lastLogin')}>
								Last Login
								<ArrowUpDownIcon class="size-3" />
							</button>
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.students as student (student.id)}
						<Table.Row>
							<Table.Cell class="font-mono text-sm">{student.id}</Table.Cell>
							<Table.Cell class="font-medium">{student.name}</Table.Cell>
							<Table.Cell>{formatDuration(student.totalLabSeconds)}</Table.Cell>
							<Table.Cell>{formatDuration(student.totalActiveSeconds)}</Table.Cell>
							<Table.Cell>{formatDuration(student.totalIdleSeconds)}</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm">{formatDateTime(student.lastLogin)}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between">
				<p class="text-muted-foreground text-sm">
					Page {data.page} of {totalPages}
				</p>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={data.page <= 1}
						onclick={() => handlePage(data.page - 1)}
					>
						<ChevronLeftIcon class="size-4" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={data.page >= totalPages}
						onclick={() => handlePage(data.page + 1)}
					>
						Next
						<ChevronRightIcon class="size-4" />
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>
