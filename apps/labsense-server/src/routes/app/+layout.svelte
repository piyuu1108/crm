<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	import { page } from '$app/stores';

	let { data, children } = $props();

	type Crumb = { label: string; href?: string };

	const getCrumbs = (path: string): Crumb[] => {
		const segments = path.split('/').filter(Boolean);
		if (segments.length <= 1) return [];

		const section = segments[1]; // students, labs, settings, etc.

		if (section === 'settings') return [{ label: 'Settings' }];
		if (section === 'admins') return [{ label: 'Administrators' }];
		if (section === 'logs') return [{ label: 'Logs' }];

		if (section === 'students') {
			if (path === '/app/students/add') return [{ label: 'Students', href: '/app/students' }, { label: 'Add Student' }];
			if (path === '/app/students/bulk') return [{ label: 'Students', href: '/app/students' }, { label: 'Bulk Import' }];
			if (segments.length === 2) return [{ label: 'Students' }];
			if (segments.length === 3) return [{ label: 'Students', href: '/app/students' }, { label: 'Profile' }];
			if (segments.length === 4) return [{ label: 'Students', href: '/app/students' }, { label: 'Profile', href: `/app/students/${segments[2]}` }, { label: 'Session' }];
			if (segments.length >= 5) return [{ label: 'Students', href: '/app/students' }, { label: 'Profile', href: `/app/students/${segments[2]}` }, { label: 'Session', href: `/app/students/${segments[2]}/${segments[3]}` }, { label: 'App Details' }];
			return [{ label: 'Students' }];
		}

		if (section === 'labs') {
			if (segments.length === 2) return [{ label: 'Labs' }];
			if (segments.length >= 3) return [{ label: 'Labs', href: '/app/labs' }, { label: 'Machine' }];
			return [{ label: 'Labs' }];
		}

		return [];
	};

	let crumbs = $derived(getCrumbs($page.url.pathname));
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
						{#each crumbs as crumb, i}
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								{#if crumb.href && i < crumbs.length - 1}
									<Breadcrumb.Link href={crumb.href} class="text-muted-foreground hover:text-foreground transition-colors">{crumb.label}</Breadcrumb.Link>
								{:else}
									<Breadcrumb.Page class="font-semibold text-foreground">{crumb.label}</Breadcrumb.Page>
								{/if}
							</Breadcrumb.Item>
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
