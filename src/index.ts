import "dotenv/config";
import { createApp } from "./app";
import { createPrismaClient } from "./prismaClient";
import { PrismaProductRepository } from "./products/productRepository";
import { PrismaUserRepository } from "./userRegistration/userRepository";
import { ProductService } from "./products/productService";
import { UserService } from "./userRegistration/userService";
import { PrismaLoginRepository } from "./userLogin/loginRepository";
import { LoginService } from "./userLogin/loginService";

if (!process.env.PORT) {
	throw new Error("PORT environment variable is not set");
}

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT);

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
	throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

if (!process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is not set");
}

const prisma = createPrismaClient();
const userService = new UserService(new PrismaUserRepository(prisma));
const productService = new ProductService(new PrismaProductRepository(prisma));
const loginService = new LoginService(
	new PrismaLoginRepository(prisma),
	process.env.JWT_SECRET,
);
const app = createApp(userService, productService, loginService);

// Keep everything below this comment at the bottom of the file
const server = app.listen(PORT, HOST, () => {
	console.log(`Listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		server.close(() => {
			void prisma
				.$disconnect()
				.then(() => process.exit(0))
				.catch((error: unknown) => {
					console.error("Failed to disconnect Prisma Client", error);
					process.exitCode = 1;
				});
		});
	});
}
