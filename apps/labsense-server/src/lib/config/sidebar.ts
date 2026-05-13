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
			items: [
				{
					title: "LAB-1",
					url: "/app/labs/lab-1",
				},
				{
					title: "LAB-2",
					url: "/app/labs/lab-2",
				},
				{
					title: "LAB-3",
					url: "/app/labs/lab-3",
				},
				{
					title: "LAB-4",
					url: "/app/labs/lab-4",
				},
				{
					title: "LAB-5",
					url: "/app/labs/lab-5",
				},
			],
		},
		{
			title: "Admins",
			url: "/app/admins",
			icon: ShieldIcon,
			items: [
				{
					title: "Admins",
					url: "/app/admins",
				},
				{
					title: "Create Admin",
					url: "/app/admins/create",
				},
			],
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