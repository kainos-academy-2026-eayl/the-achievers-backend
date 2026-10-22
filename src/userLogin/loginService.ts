import * as argon2 from "argon2";
import { SignJWT } from "jose";
import type { LoginUserDto } from "../dtos/loginUserDto";
import { InvalidCredentialsError } from "../errors/invalidCredentialsError";
import { toUserResponseDto } from "../mappers/userMapper";
import type { LoginRepository } from "./loginRepository";

// Verify a hash even for unknown users, avoiding a fast email-existence check.
const dummyPasswordHash =
	"$argon2id$v=19$m=65536,p=4,t=3$xTJIwg8zM0cHTnXLjwMCtg$pXX27zLaX9/sfr3WD+319Fy5BMFHbiujW/UxcuY0BLo";
const tokenLifetimeSeconds = 3600;

export class LoginService {
	private readonly signingKey: Uint8Array;

	constructor(
		private readonly loginRepository: LoginRepository,
		jwtSecret: string,
	) {
		this.signingKey = new TextEncoder().encode(jwtSecret);
		if (this.signingKey.byteLength < 32) {
			throw new Error("JWT_SECRET must contain at least 32 bytes");
		}
	}

	async login(input: LoginUserDto) {
		const user = await this.loginRepository.findByEmail(input.email);
		const passwordMatches = await argon2.verify(
			user?.passwordHash ?? dummyPasswordHash,
			input.password,
		);
		if (!user || !passwordMatches) {
			throw new InvalidCredentialsError();
		}

		const accessToken = await new SignJWT({})
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setSubject(String(user.id))
			.setIssuer("the-achievers-backend")
			.setAudience("the-achievers-api")
			.setIssuedAt()
			.setExpirationTime(`${tokenLifetimeSeconds}s`)
			.sign(this.signingKey);

		return {
			accessToken,
			tokenType: "Bearer",
			expiresIn: tokenLifetimeSeconds,
			user: toUserResponseDto(user),
		};
	}
}
