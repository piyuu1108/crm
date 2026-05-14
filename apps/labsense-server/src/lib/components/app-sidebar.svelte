<script lang="ts" module>
	import { sidebarConfig } from "$lib/config/sidebar";
</script>

<script lang="ts">
	import NavMain from "./nav-main.svelte";
	import NavUser from "./nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import CommandIcon from "@lucide/svelte/icons/command";
	import type { ComponentProps } from "svelte";

	let { 
		user,
		ref = $bindable(null), 
		...restProps 
	}: {
		user: {
			name: string;
			email: string;
			avatar: string;
		};
	} & ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
					{#snippet child({ props })}
						<a href="/app" {...props}>
							<div
								class="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden"
							>
								<img src="/favicon.png" alt="LabSense Logo" class="size-7 object-contain" />
							</div>
							<div class="grid flex-1 text-start text-sm leading-tight">
								<span class="truncate font-semibold">Lab Sense</span>
								<span class="truncate text-xs text-muted-foreground">VTCBCSR</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain label="Platform" items={sidebarConfig.navMain} />
		<NavMain label="Manage" items={sidebarConfig.navManage} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser {user} />
	</Sidebar.Footer>
</Sidebar.Root>
