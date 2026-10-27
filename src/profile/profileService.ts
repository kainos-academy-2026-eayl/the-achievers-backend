import * as argon2 from "argon2";
import type { UpdateProfileDto } from "../dtos/updateProfileDto";
import { CurrentPasswordError } from "../errors/currentPasswordError";
import { ProfileNotFoundError } from "../errors/profileNotFoundError";
import type { User } from "../generated/prisma/client";
import type { ProfileRepository } from "./profileRepository";

type PasswordVerifier = (hash: string, password: string) => Promise<boolean>;

export class ProfileService {
	constructor(
		private readonly profileRepository: ProfileRepository,
		private readonly verifyPassword: PasswordVerifier = argon2.verify,
	) {}

	async getProfile(userId: number): Promise<User> {
		const user = await this.profileRepository.findById(userId);
		if (!user) throw new ProfileNotFoundError();
		return user;
	}

	async updateProfile(userId: number, input: UpdateProfileDto): Promise<User> {
		const user = await this.getProfile(userId);
		const { currentPassword, ...data } = input;

		if (!(await this.verifyPassword(user.passwordHash, currentPassword))) {
			throw new CurrentPasswordError("Your current password is incorrect");
		}

		return this.profileRepository.update(userId, data);
	}
}
