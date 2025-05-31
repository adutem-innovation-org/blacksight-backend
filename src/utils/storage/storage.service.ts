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
    const fileRef = ref(this.storage, location);
    await uploadBytes(fileRef, file.buffer);
    const fileUrl = await getDownloadURL(fileRef);
    const { size, fullPath, name, timeCreated, contentType } =
      await getMetadata(fileRef);
    return {
      metadata: {
        size,
        fullPath,
        name,
        timeCreated,
        contentType,
      },
      fileUrl,
    };
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
