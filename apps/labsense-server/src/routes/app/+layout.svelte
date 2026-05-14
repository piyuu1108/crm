<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	import { page } from '$app/stores';

	let { data, children } = $props();

	const getTitle = (path: string) => {
		const segments = path.split('/').filter(Boolean);
		if (segments.length <= 1) return 'Dashboard';

		if (path.startsWith('/app/labs')) return 'Labs';
		if (path.startsWith('/app/admins')) return 'Administrators';
		if (path.startsWith('/app/logs')) return 'Logs';
		if (path.startsWith('/app/settings')) return 'Settings';
		
		if (path.startsWith('/app/students')) {
			if (path === '/app/students/add') return 'Add Students';
			if (path === '/app/students/bulk') return 'Bulk Import';
			// If there's an ID after /app/students/
			if (segments.length > 2) return 'Student Profile';
			return 'Students';
		}

		return 'Dashboard';
	};

	let title = $derived(getTitle($page.url.pathname));
</script>

<Sidebar.Provider>
	<AppSidebar user={{ name: data.user.username, email: 'admin@vtcbcsr', avatar: '' }} />
	<Sidebar.Inset>
		<header class="flex h-16 shrink-0 items-center gap-2 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item>
							<Breadcrumb.Link href="/app" class="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Breadcrumb.Link>
						</Breadcrumb.Item>
						{#if title !== 'Dashboard'}
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Page class="font-semibold text-foreground">{title}</Breadcrumb.Page>
							</Breadcrumb.Item>
						{/if}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
