import "dotenv/config";
import { createApp } from "./app";
import { PrismaCartRepository } from "./cart/cartRepository";
import { CartService } from "./cart/cartService";
import { PrismaOrderRepository } from "./orders/orderRepository";
import { OrderService } from "./orders/orderService";
import { startOrderStatusWorker } from "./orders/orderStatusWorker";
import { createPrismaClient } from "./prismaClient";
import { PrismaProductRepository } from "./products/productRepository";
import { ProductService } from "./products/productService";
import { PrismaProductImageRepository } from "./products/productImageRepository";
import { ProductImageService } from "./products/productImageService";
import { LocalImageStorage } from "./products/productImageStorage";
import { PrismaProfileRepository } from "./profile/profileRepository";
import { ProfileService } from "./profile/profileService";
import { PrismaReviewRepository } from "./reviews/reviewRepository";
import { ReviewService } from "./reviews/reviewService";
import { PrismaLoginRepository } from "./userLogin/loginRepository";
import { LoginService } from "./userLogin/loginService";
import { PrismaUserRepository } from "./userRegistration/userRepository";
import { UserService } from "./userRegistration/userService";

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT ?? "3000");

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
	throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

if (!process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is not set");
}

const prisma = createPrismaClient();
const userService = new UserService(new PrismaUserRepository(prisma));
const productRepository = new PrismaProductRepository(prisma);
const imageStorage = new LocalImageStorage(
	process.env.UPLOADS_DIR ?? "./uploads",
);
const productService = new ProductService(productRepository, imageStorage);
const productImageService = new ProductImageService(
	productRepository,
	new PrismaProductImageRepository(prisma),
	imageStorage,
);
const loginService = new LoginService(
	new PrismaLoginRepository(prisma),
	process.env.JWT_SECRET,
);
const cartService = new CartService(
	new PrismaCartRepository(prisma),
	productRepository,
);
const orderService = new OrderService(new PrismaOrderRepository(prisma));
const app = createApp(
	userService,
	productService,
	loginService,
	cartService,
	process.env.JWT_SECRET,
	process.env.FRONTEND_ORIGIN ?? "http://localhost:8000",
	{
		service: new ProfileService(new PrismaProfileRepository(prisma)),
		jwtSecret: process.env.JWT_SECRET,
	},
	{
		service: productService,
		jwtSecret: process.env.JWT_SECRET,
	},
	{
		service: orderService,
		jwtSecret: process.env.JWT_SECRET,
	},
	{
		service: new ReviewService(new PrismaReviewRepository(prisma)),
		jwtSecret: process.env.JWT_SECRET,
	},
	{
		service: productImageService,
		jwtSecret: process.env.JWT_SECRET,
	},
);
const stopOrderStatusWorker = startOrderStatusWorker(orderService);

// Keep everything below this comment at the bottom of the file
const server = app.listen(PORT, HOST, () => {
	console.log(`Listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		stopOrderStatusWorker();
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
