<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';

	let { sessions } = $props<{
		sessions: {
			id: string;
			studentName: string;
			studentId: string;
			pcName: string;
			loginAt: Date;
			status: string;
		}[];
	}>();

	function formatDate(date: Date) {
		return new Date(date).toLocaleString('en-US', {
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		});
	}
</script>

<div class="rounded-md border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Student</Table.Head>
				<Table.Head>PC Name</Table.Head>
				<Table.Head>Login Time</Table.Head>
				<Table.Head class="text-right">Status</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each sessions as session (session.id)}
				<Table.Row>
					<Table.Cell>
						<div class="font-medium">{session.studentName}</div>
						<div class="text-muted-foreground text-sm">{session.studentId}</div>
					</Table.Cell>
					<Table.Cell>{session.pcName}</Table.Cell>
					<Table.Cell>{formatDate(session.loginAt)}</Table.Cell>
					<Table.Cell class="text-right">
						<Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
							{session.status}
						</Badge>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
