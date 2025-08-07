import { FirebaseApp, initializeApp } from "firebase/app";
import { config } from "@/config";
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  getMetadata,
  deleteObject,
} from "firebase/storage";
import { Multer } from "multer";
import { throwServerError } from "@/helpers";
import { readFile, unlink } from "fs/promises";

export class StorageService {
  generateFilePath(userId: string, ext: string): string {
    const timestamp = Date.now();
    return `uploads/products/${userId}-${timestamp}.${ext}`;
  }
  private static instance: StorageService;

  private readonly app: FirebaseApp;
  private readonly storage: FirebaseStorage;

  constructor() {
    this.app = initializeApp(config.firebase.storage);
    this.storage = getStorage(this.app);
  }

  static getInstance(): StorageService {
    if (!this.instance) {
      this.instance = new StorageService();
    }
    return this.instance;
  }

  uploadFile = async (file: Express.Multer.File, location: string) => {
    console.log("File object:", {
      originalname: file.originalname,
      size: file.size,
      path: file.path,
      bufferExists: !!file.buffer,
      storageType: file.buffer ? "memory" : "disk",
      mimetype: file.mimetype,
    });

    let fileBuffer: Buffer;
    let shouldCleanup = false;

    try {
      if (file.buffer) {
        // Memory storage - buffer is already available
        console.log("Using memory storage buffer");
        fileBuffer = file.buffer;
      } else if (file.path) {
        // Disk storage - read from file system
        console.log("Reading from disk storage:", file.path);
        fileBuffer = await readFile(file.path);
        shouldCleanup = true; // We'll clean up the temp file after upload
      } else {
        throw new Error("No file buffer or path available");
      }

      if (fileBuffer.length === 0) {
        throw new Error("File is empty");
      }

      if (fileBuffer.length !== file.size) {
        console.warn(
          `Buffer size mismatch! Expected: ${file.size}, Got: ${fileBuffer.length}`
        );
      }

      const fileRef = ref(this.storage, location);

      const metadata = {
        contentType: file.mimetype,
        customMetadata: {
          originalName: file.originalname,
          originalSize: file.size.toString(),
          storageType: file.buffer ? "memory" : "disk",
        },
      };

      await uploadBytes(fileRef, fileBuffer, metadata);

      const fileUrl = await getDownloadURL(fileRef);
      const { size, fullPath, name, timeCreated, contentType } =
        await getMetadata(fileRef);

      console.log("Upload successful:", {
        size,
        fullPath,
        name,
        timeCreated,
        contentType,
      });

      return {
        metadata: {
          size,
          fullPath,
          name,
          timeCreated,
          contentType,
          originalName: file.originalname,
        },
        fileUrl,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    } finally {
      // Clean up temporary disk file if it exists
      if (shouldCleanup && file.path) {
        try {
          await unlink(file.path);
          console.log("Cleaned up temporary file:", file.path);
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary file:", cleanupError);
          // Don't throw here - the main upload might have succeeded
        }
      }
    }
  };

  deleteFile = async (location: string) => {
    try {
      const fileRef = ref(this.storage, location);
      await deleteObject(fileRef);
      return { success: true };
    } catch (error) {
      if (typeof error === "string") throwServerError(error);
      if ((error as any).message) throwServerError((error as any).message);
    }
  };
}
