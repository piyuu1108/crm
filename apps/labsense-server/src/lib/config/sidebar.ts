// src/lib/config/sidebar.ts

import type { Component } from "svelte";

import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
import FlaskConicalIcon from "@lucide/svelte/icons/flask-conical";
import ScrollTextIcon from "@lucide/svelte/icons/scroll-text";
import ShieldIcon from "@lucide/svelte/icons/shield";
import Settings2Icon from "@lucide/svelte/icons/settings-2";
import UsersIcon from "@lucide/svelte/icons/users";

export type SidebarSubItem = {
	title: string;
	url: string;
};

export type SidebarItem = {
	title: string;
	url: string;
	icon: Component;
	isActive?: boolean;
	items?: SidebarSubItem[];
};

export type SidebarConfig = {
	navMain: SidebarItem[];
	navManage: SidebarItem[];
};

export const sidebarConfig: SidebarConfig = {
	navMain: [
		{
			title: "Dashboard",
			url: "/app",
			icon: LayoutDashboardIcon,
			isActive: true,
		},

		{
			title: "Labs",
			url: "/app/labs",
			icon: FlaskConicalIcon,
			
		},
		{
			title: "Admins",
			url: "/app/admins",
			icon: ShieldIcon,
			
		},

		{
			title: "Logs",
			url: "/app/logs",
			icon: ScrollTextIcon,
		},

		

		{
			title: "Settings",
			url: "/app/settings",
			icon: Settings2Icon,
		},
	],
	navManage: [
		{
			title: "Students",
			url: "/app/students",
			icon: UsersIcon,
			items: [
				{
					title: "Add Students",
					url: "/app/students/add",
				},
				{
					title: "Bulk Import",
					url: "/app/students/bulk",
				},
			],
		},
	],
};