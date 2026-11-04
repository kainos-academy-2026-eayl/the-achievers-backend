export interface CreateUserData {
	email: string;
	name: string;
	passwordHash: string;
	safeWordHint?: string | null;
	safeWordHash?: string | null;
}
