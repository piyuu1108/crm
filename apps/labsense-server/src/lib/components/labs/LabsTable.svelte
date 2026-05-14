<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { goto } from '$app/navigation';
	import type { LabMachine } from '$lib/types/labs';

	let { machines } = $props<{
		machines: LabMachine[];
	}>();

	function getStatus(lastSeenAt: Date | null) {
		if (!lastSeenAt) return 'offline';
		const diff = Date.now() - new Date(lastSeenAt).getTime();
		return diff < 1000 * 60 * 5 ? 'online' : 'offline';
	}
</script>

<div class="rounded-md border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Machine</Table.Head>
				<Table.Head>Hardware ID</Table.Head>
				<Table.Head>Lab</Table.Head>
				<Table.Head>Last/Current Occupant</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head class="text-right">Last Seen</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each machines as machine (machine.id)}
				{@const status = getStatus(machine.lastSeenAt)}
				<Table.Row 
					class="cursor-pointer hover:bg-muted/50 transition-colors"
					onclick={() => goto(`/app/labs/${machine.id}`)}
				>
					<Table.Cell>
						<div class="font-medium">{machine.pcName}</div>
					</Table.Cell>
					<Table.Cell class="font-mono text-xs">{machine.hardwareId}</Table.Cell>
					<Table.Cell>{machine.labName || 'N/A'}</Table.Cell>
					<Table.Cell>
						{#if machine.latestSession?.student}
							<div class="font-medium">{machine.latestSession.student.name}</div>
							<div class="text-muted-foreground text-xs">{machine.latestSession.student.id}</div>
						{:else}
							<span class="text-muted-foreground">No recent activity</span>
						{/if}
					</Table.Cell>
					<Table.Cell>
						<div class="flex items-center gap-2">
							<div
								class={cn(
									'h-2 w-2 rounded-full',
									status === 'online' ? 'bg-green-500' : 'bg-muted-foreground/30'
								)}
							></div>
							<span class="capitalize">{status}</span>
							{#if machine.latestSession?.status === 'active'}
								<Badge variant="outline" class="ml-2 bg-blue-50/50 text-blue-700 border-blue-200">
									In Use
								</Badge>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="text-right">
						{machine.lastSeenAt ? new Date(machine.lastSeenAt).toLocaleString() : 'Never'}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
