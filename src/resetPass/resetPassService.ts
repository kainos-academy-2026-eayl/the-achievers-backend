import * as argon2 from "argon2";
import type {
	ResetPasswordDto,
	VerifySafeWordDto,
} from "../dtos/resetPasswordDto";
import { InvalidSafeWordError } from "../errors/invalidSafeWordError";
import type { ResetPassRepository } from "./resetPassRepository";

// Verify a hash even for unknown users, avoiding a fast email-existence check.
const dummySafeWordHash =
	"$argon2id$v=19$m=65536,p=4,t=3$xTJIwg8zM0cHTnXLjwMCtg$pXX27zLaX9/sfr3WD+319Fy5BMFHbiujW/UxcuY0BLo";

type PasswordHasher = (password: string) => Promise<string>;

export class ResetPassService {
	constructor(
		private readonly repository: ResetPassRepository,
		private readonly hashPassword: PasswordHasher = (password) =>
			argon2.hash(password, { type: argon2.argon2id }),
	) {}

	async verifySafeWord(input: VerifySafeWordDto): Promise<void> {
		const user = await this.repository.findSafeWordHashByEmail(input.email);
		const matches = await argon2.verify(
			user?.safeWordHash ?? dummySafeWordHash,
			input.safeWord,
		);
		if (!user?.safeWordHash || !matches) {
			throw new InvalidSafeWordError();
		}
	}

	async resetPassword(input: ResetPasswordDto): Promise<void> {
		await this.verifySafeWord(input);
		const passwordHash = await this.hashPassword(input.newPassword);
		await this.repository.updatePasswordHash(input.email, passwordHash);
	}
}
