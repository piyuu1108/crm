<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CirclePlusIcon from '@lucide/svelte/icons/circle-plus';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import CircleMinusIcon from '@lucide/svelte/icons/circle-minus';

	let { form } = $props();
	let loading = $state(false);
	let importLoading = $state(false);
	let dragActive = $state(false);
	let fileInput = $state<HTMLInputElement>(null!);
	let selectedFile = $state<File | null>(null);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
		const file = e.dataTransfer?.files?.[0];
		if (file && file.name.endsWith('.csv')) {
			selectedFile = file;
			const dt = new DataTransfer();
			dt.items.add(file);
			fileInput.files = dt.files;
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		selectedFile = target.files?.[0] ?? null;
	}

	const step = $derived(form?.step || 'upload');
	const newRows = $derived(
		form?.step === 'preview' ? form.preview.filter((r: any) => r.status === 'new') : []
	);
</script>

<svelte:head>
	<title>Bulk Import Students | LabSense</title>
</svelte:head>

<div class="mx-auto max-w-96 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<Button variant="outline" size="icon" href="/app/students" class="size-9">
			<ArrowLeftIcon class="size-4" />
		</Button>
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Bulk Import</h2>
			<p class="text-muted-foreground text-sm">Import multiple students from a CSV file</p>
		</div>
	</div>

	<!-- ───── UPLOAD STEP ───── -->
	{#if step === 'upload' || step === undefined}
		<Card.Root>
			<Card.Header>
				<Card.Title>Upload CSV</Card.Title>
				<Card.Description>
					Expected format: <code class="bg-muted rounded px-1.5 py-0.5 text-xs">collegeId,name,password</code>
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/preview"
					enctype="multipart/form-data"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
					class="space-y-5"
				>
					<!-- Drop Zone -->
					<div
						class="group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 transition-all {dragActive
							? 'border-primary bg-primary/5 scale-[1.01]'
							: 'border-border hover:border-primary/40 hover:bg-muted/30'}"
						role="button"
						tabindex="0"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
						onclick={() => fileInput.click()}
						onkeydown={(e) => { if (e.key === 'Enter') fileInput.click(); }}
					>
						{#if selectedFile}
							<div class="bg-primary/10 flex size-12 items-center justify-center rounded-full">
								<FileSpreadsheetIcon class="text-primary size-6" />
							</div>
							<div class="text-center">
								<p class="font-semibold text-sm">{selectedFile.name}</p>
								<p class="text-muted-foreground text-xs">{(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
							</div>
						{:else}
							<div class="bg-muted flex size-12 items-center justify-center rounded-full transition-colors group-hover:bg-primary/10">
								<UploadIcon class="text-muted-foreground size-6 transition-colors group-hover:text-primary" />
							</div>
							<div class="text-center">
								<p class="font-semibold text-sm">Drop CSV file here</p>
								<p class="text-muted-foreground text-xs">or click to browse your files</p>
							</div>
						{/if}
						<input
							bind:this={fileInput}
							type="file"
							name="file"
							accept=".csv"
							class="hidden"
							onchange={handleFileChange}
						/>
					</div>

					{#if form?.error}
						<div class="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium">
							<AlertCircleIcon class="size-4 shrink-0" />
							{form.error}
						</div>
					{/if}

					<Button type="submit" disabled={!selectedFile || loading} class="w-full">
						{#if loading}
							<LoaderCircleIcon class="size-4 animate-spin" />
							Parsing CSV...
						{:else}
							<UploadIcon class="size-4" />
							Upload & Preview
						{/if}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">CSV Format</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				<p class="text-muted-foreground text-sm">Your CSV must include a header row:</p>
				<div class="bg-muted rounded-lg px-4 py-3">
					<code class="text-xs">collegeId,name,password</code>
				</div>
				<Separator />
				<p class="text-muted-foreground text-sm font-medium">Example:</p>
				<div class="bg-muted space-y-0.5 rounded-lg px-4 py-3 font-mono text-xs">
					<p>collegeId,name,password</p>
					<p class="text-muted-foreground">2024001,Rahul Sharma,pass123</p>
					<p class="text-muted-foreground">2024002,Priya Patel,pass456</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- ───── PREVIEW STEP ───── -->
	{#if step === 'preview' && form?.preview}
		<!-- Summary Cards -->
		<div class="grid grid-cols-2 gap-3">
			<Card.Root>
				<Card.Content class="flex items-center gap-3 pt-6">
					<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
						<CirclePlusIcon class="size-4 text-green-600 dark:text-green-400" />
					</div>
					<div>
						<p class="text-xl font-bold">{form.counts.new}</p>
						<p class="text-muted-foreground text-xs">New</p>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="flex items-center gap-3 pt-6">
					<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
						<CircleAlertIcon class="size-4 text-yellow-600 dark:text-yellow-400" />
					</div>
					<div>
						<p class="text-xl font-bold">{form.counts.duplicate}</p>
						<p class="text-muted-foreground text-xs">Exists</p>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="flex items-center gap-3 pt-6">
					<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
						<CircleMinusIcon class="size-4 text-orange-600 dark:text-orange-400" />
					</div>
					<div>
						<p class="text-xl font-bold">{form.counts.csvDuplicate}</p>
						<p class="text-muted-foreground text-xs">CSV Dupes</p>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="flex items-center gap-3 pt-6">
					<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
						<CircleXIcon class="size-4 text-red-600 dark:text-red-400" />
					</div>
					<div>
						<p class="text-xl font-bold">{form.counts.invalid}</p>
						<p class="text-muted-foreground text-xs">Invalid</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Preview Table -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">Preview</Card.Title>
				<Card.Description>Review before importing.</Card.Description>
			</Card.Header>
			<Card.Content class="p-0">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="pl-4">College ID</Table.Head>
							<Table.Head>Name</Table.Head>
							<Table.Head>Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each form.preview as row, i (row.collegeId + '-' + i)}
							<Table.Row>
								<Table.Cell class="pl-4 font-mono text-xs">{row.collegeId}</Table.Cell>
								<Table.Cell class="text-sm">{row.name}</Table.Cell>
								<Table.Cell>
									{#if row.status === 'new'}
										<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
											<span class="size-1.5 rounded-full bg-green-500"></span>New
										</span>
									{:else if row.status === 'duplicate'}
										<span class="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
											<span class="size-1.5 rounded-full bg-yellow-500"></span>Exists
										</span>
									{:else}
										<span class="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
											<span class="size-1.5 rounded-full bg-orange-500"></span>Dupe
										</span>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<!-- Invalid Rows -->
		{#if form.invalid && form.invalid.length > 0}
			<Card.Root class="border-destructive/30">
				<Card.Header>
					<Card.Title class="text-destructive text-sm">Invalid Rows ({form.invalid.length})</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2">
					{#each form.invalid as inv}
						<div class="bg-muted/50 flex items-start gap-2 rounded-md px-3 py-2 text-xs">
							<span class="text-muted-foreground shrink-0 font-mono">L{inv.line}</span>
							<span class="text-destructive">{inv.reason}</span>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Action Bar -->
		<div class="flex items-center justify-between">
			<Button variant="ghost" size="sm" href="/app/students/bulk">
				<ArrowLeftIcon class="size-4" />
				Start Over
			</Button>
			{#if newRows.length > 0}
				<form
					method="POST"
					action="?/import"
					use:enhance={() => {
						importLoading = true;
						return async ({ update }) => {
							importLoading = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="rows" value={JSON.stringify(newRows.map((r: any) => ({ collegeId: r.collegeId, name: r.name, password: r.password })))} />
					<Button type="submit" size="sm" disabled={importLoading}>
						{#if importLoading}
							<LoaderCircleIcon class="size-4 animate-spin" />
							Importing...
						{:else}
							Import {newRows.length} Student{newRows.length !== 1 ? 's' : ''}
						{/if}
					</Button>
				</form>
			{:else}
				<p class="text-muted-foreground text-sm">No new students to import.</p>
			{/if}
		</div>
	{/if}

	<!-- ───── DONE STEP ───── -->
	{#if step === 'done' && form?.summary}
		<Card.Root>
			<Card.Content class="flex flex-col items-center space-y-5 pt-10 pb-8">
				<div class="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
					<CheckCircle2Icon class="size-7 text-green-600 dark:text-green-400" />
				</div>
				<div class="text-center space-y-1">
					<h3 class="text-xl font-bold">Import Complete</h3>
					<p class="text-muted-foreground text-sm">Students have been added to the system.</p>
				</div>

				<Separator />

				<div class="grid w-full grid-cols-2 gap-4 text-center">
					<div>
						<p class="text-3xl font-bold text-green-600">{form.summary.imported}</p>
						<p class="text-muted-foreground text-xs">Imported</p>
					</div>
					<div>
						<p class="text-3xl font-bold text-muted-foreground">{form.summary.skipped}</p>
						<p class="text-muted-foreground text-xs">Skipped</p>
					</div>
				</div>

				<Separator />

				<div class="flex gap-3 pt-2">
					<Button variant="outline" href="/app/students/bulk">Import More</Button>
					<Button href="/app/students">View Students</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
