import * as argon2 from "argon2";
import type { RegisterUserDto } from "../dtos/registerUserDto";
import type { UserRepository } from "./userRepository";

type PasswordHasher = (password: string) => Promise<string>;

export class UserService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly hashPassword: PasswordHasher = (password) =>
			argon2.hash(password, { type: argon2.argon2id }),
	) {}

	async register(input: RegisterUserDto) {
		const passwordHash = await this.hashPassword(input.password);
		const safeWordHash = await argon2.hash(input.safeWord, {
			type: argon2.argon2id,
		});

		return this.userRepository.create({
			email: input.email,
			name: input.name,
			passwordHash,
			safeWordHint: input.safeWordHint,
			safeWordHash,
		});
	}
}
