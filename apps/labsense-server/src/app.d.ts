// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: import('./lib/server/db/schema').masterUsers.$inferSelect | null;
			session: import('./lib/server/db/schema').adminSessions.$inferSelect | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
