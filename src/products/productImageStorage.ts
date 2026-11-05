import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export interface SupportedImageType {
	contentType: "image/jpeg" | "image/png" | "image/webp";
	extension: "jpg" | "png" | "webp";
}

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function detectImageType(data: Buffer): SupportedImageType | null {
	if (
		data.length >= 3 &&
		data[0] === 0xff &&
		data[1] === 0xd8 &&
		data[2] === 0xff
	) {
		return { contentType: "image/jpeg", extension: "jpg" };
	}
	if (
		data.length >= PNG_SIGNATURE.length &&
		data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
	) {
		return { contentType: "image/png", extension: "png" };
	}
	if (
		data.length >= 12 &&
		data.subarray(0, 4).toString("ascii") === "RIFF" &&
		data.subarray(8, 12).toString("ascii") === "WEBP"
	) {
		return { contentType: "image/webp", extension: "webp" };
	}
	return null;
}

export interface ImageStorage {
	save(data: Buffer, type: SupportedImageType): Promise<string>;
	read(storageKey: string): Promise<Buffer>;
	remove(storageKey: string): Promise<void>;
}

export async function discardStoredImage(
	storage: Pick<ImageStorage, "remove">,
	storageKey: string,
): Promise<void> {
	try {
		await storage.remove(storageKey);
	} catch (error) {
		console.error("Failed to remove stored product image", storageKey, error);
	}
}

export class LocalImageStorage implements ImageStorage {
	constructor(private readonly rootDir: string) {}

	async save(data: Buffer, type: SupportedImageType): Promise<string> {
		const storageKey = `${randomUUID()}.${type.extension}`;
		await mkdir(this.rootDir, { recursive: true });
		await writeFile(this.pathFor(storageKey), data, { flag: "wx" });
		return storageKey;
	}

	read(storageKey: string): Promise<Buffer> {
		return readFile(this.pathFor(storageKey));
	}

	async remove(storageKey: string): Promise<void> {
		await rm(this.pathFor(storageKey), { force: true });
	}

	private pathFor(storageKey: string): string {
		return path.join(this.rootDir, storageKey);
	}
}
