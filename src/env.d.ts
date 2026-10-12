declare namespace App {
	interface AuthInfo {
		id: string;
		username: string;
	}

	interface Locals {
		user: AuthInfo | undefined;
	}
}