<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Shield, Key, Clock, Plus, UserPlus } from 'lucide-svelte';

	let { data, form } = $props();

	let selectedAdmin = $state<{ id: string; username: string } | null>(null);
	let isPasswordDialogOpen = $state(false);
	let isCreateDialogOpen = $state(false);

	function openChangePassword(admin: { id: string; username: string }) {
		selectedAdmin = admin;
		isPasswordDialogOpen = true;
	}

	$effect(() => {
		if (form?.success) {
			toast.success(form.message);
			isPasswordDialogOpen = false;
			isCreateDialogOpen = false;
		} else if (form?.message) {
			toast.error(form.message);
		}
	});
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-3xl font-bold tracking-tight">Administrators</h2>
			<p class="text-muted-foreground">Manage system administrators and security</p>
		</div>
		<Button onclick={() => (isCreateDialogOpen = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Add Admin
		</Button>
	</div>

	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Username</Table.Head>
					<Table.Head>Created At</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.admins as admin (admin.id)}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<Shield class="h-4 w-4 text-primary" />
								<span class="font-medium">{admin.username}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2 text-muted-foreground">
								<Clock class="h-4 w-4" />
								{new Date(admin.createdAt).toLocaleDateString()}
							</div>
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button variant="outline" size="sm" onclick={() => openChangePassword(admin)}>
								<Key class="mr-2 h-4 w-4" />
								Change Password
							</Button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<!-- Change Password Dialog -->
<Dialog.Root bind:open={isPasswordDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Change Password</Dialog.Title>
			<Dialog.Description>
				Update password for <strong>{selectedAdmin?.username}</strong>. You must enter the current password to continue.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/changePassword" use:enhance class="space-y-4 py-4">
			<input type="hidden" name="adminId" value={selectedAdmin?.id} />
			<div class="space-y-2">
				<Label for="oldPassword">Old Password</Label>
				<Input type="password" id="oldPassword" name="oldPassword" required />
			</div>
			<div class="space-y-2">
				<Label for="newPassword">New Password</Label>
				<Input type="password" id="newPassword" name="newPassword" required />
			</div>
			<div class="space-y-2">
				<Label for="confirmPassword">Confirm New Password</Label>
				<Input type="password" id="confirmPassword" name="confirmPassword" required />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (isPasswordDialogOpen = false)}>Cancel</Button>
				<Button type="submit">Update Password</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Create Admin Dialog -->
<Dialog.Root bind:open={isCreateDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add New Administrator</Dialog.Title>
			<Dialog.Description>
				Create a new administrator account. The username must be unique.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/createAdmin" use:enhance class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="username">Username</Label>
				<Input type="text" id="username" name="username" placeholder="e.g. admin_jane" required />
			</div>
			<div class="space-y-2">
				<Label for="password">Password</Label>
				<Input type="password" id="password" name="password" required />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (isCreateDialogOpen = false)}>Cancel</Button>
				<Button type="submit">
					<UserPlus class="mr-2 h-4 w-4" />
					Create Admin
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
