<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Add Student | LabSense</title>
</svelte:head>

<div class="mx-auto max-w-96 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<Button variant="outline" size="icon" href="/app/students" class="size-9">
			<ArrowLeftIcon class="size-4" />
		</Button>
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Add Student</h2>
			<p class="text-muted-foreground text-sm">Register a new student to the system</p>
		</div>
	</div>

	<!-- Form Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Student Details</Card.Title>
			<Card.Description>Fill in the required information to create a student account.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
				class="space-y-5"
			>
				<div class="space-y-2">
					<Label for="collegeId">College ID</Label>
					<Input
						id="collegeId"
						name="collegeId"
						placeholder="e.g. 2024001"
						required
						value={form?.collegeId || ''}
					/>
					<p class="text-muted-foreground text-xs">Unique identifier for this student.</p>
				</div>

				<Separator />

				<div class="space-y-2">
					<Label for="name">Full Name</Label>
					<Input
						id="name"
						name="name"
						placeholder="e.g. Rahul Sharma"
						required
						value={form?.name || ''}
					/>
				</div>

				<Separator />

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input id="password" name="password" type="password" placeholder="••••••••" required />
					<p class="text-muted-foreground text-xs">Password is hashed securely before storage.</p>
				</div>

				{#if form?.message}
					<div class="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium">
						<svg class="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a1 1 0 011 1v4a1 1 0 01-2 0V4a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
						</svg>
						{form.message}
					</div>
				{/if}

				<Button type="submit" class="w-full" disabled={loading}>
					{#if loading}
						<LoaderCircleIcon class="size-4 animate-spin" />
						Creating...
					{:else}
						<UserPlusIcon class="size-4" />
						Create Student
					{/if}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-sm">Quick Tips</Card.Title>
		</Card.Header>
		<Card.Content class="text-muted-foreground space-y-3 text-sm">
			<div class="flex gap-2">
				<span class="text-primary mt-0.5 text-lg leading-none">•</span>
				<p>College ID must be unique per student.</p>
			</div>
			<div class="flex gap-2">
				<span class="text-primary mt-0.5 text-lg leading-none">•</span>
				<p>Passwords are hashed using Argon2 before being stored.</p>
			</div>
			<div class="flex gap-2">
				<span class="text-primary mt-0.5 text-lg leading-none">•</span>
				<p>Need to add many students? Use <a href="/app/students/bulk" class="text-primary underline">Bulk Import</a> instead.</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
