import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import type { ImageCategory } from '@/types/image';
import type { AppImage } from '@/types/image';
import type { ImageRepository } from '@/database/repositories/ImageRepository';

export type ImportedImageFile = {
  id: string;
  localUri: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  category: ImageCategory;
};

const maxDimension = 2048;
const maxSourceBytes = 35 * 1024 * 1024;

export async function importImageFile(input: {
  uri: string;
  filename?: string | null;
  mimeType?: string | null;
  width: number;
  height: number;
  category: ImageCategory;
}): Promise<ImportedImageFile> {
  if (!input.uri || !Number.isFinite(input.width) || !Number.isFinite(input.height) || input.width <= 0 || input.height <= 0) {
    throw new Error('La imagen seleccionada no contiene datos válidos.');
  }
  const source = new FileSystem.File(input.uri);
  if (!source.exists) throw new Error('No se encuentra la fotografía seleccionada. Vuelve a elegirla.');
  if ((source.size ?? 0) > maxSourceBytes) throw new Error('La foto supera el límite de 35 MB. Elige una imagen más pequeña.');

  const resized = input.width > maxDimension || input.height > maxDimension
    ? await ImageManipulator.manipulateAsync(input.uri, [{ resize: input.width >= input.height ? { width: maxDimension } : { height: maxDimension } }], { compress: 0.84, format: ImageManipulator.SaveFormat.JPEG })
    : await ImageManipulator.manipulateAsync(input.uri, [], { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG });
  const directory = new FileSystem.Directory(FileSystem.Paths.document, 'images', input.category);
  if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
  const id = Crypto.randomUUID();
  const destination = new FileSystem.File(directory, `${id}.jpg`);
  try {
    await new FileSystem.File(resized.uri).copy(destination);
    if (!destination.exists || !destination.size) throw new Error('No se pudo verificar la fotografía guardada.');
    return {
      id, localUri: destination.uri, originalFilename: input.filename?.trim() || 'fotografia.jpg',
      mimeType: 'image/jpeg', fileSize: destination.size, width: resized.width, height: resized.height, category: input.category,
    };
  } catch (error) {
    if (destination.exists) destination.delete();
    throw new Error(error instanceof Error ? `No se pudo guardar la fotografía: ${error.message}` : 'No se pudo guardar la fotografía. Comprueba el espacio disponible.');
  }
}

export async function removeImageFile(uri: string): Promise<void> {
  const file = new FileSystem.File(uri);
  if (file.exists) file.delete();
}

export async function deleteImageIfUnused(repository: ImageRepository, imageId: string): Promise<boolean> {
  const image = await repository.getById(imageId);
  if (!image || await repository.isReferenced(imageId)) return false;
  await removeImageFile(image.localUri);
  return repository.removeRecordIfUnused(imageId);
}

export async function findMissingImageFiles(images: AppImage[]): Promise<AppImage[]> {
  return images.filter((image) => !new FileSystem.File(image.localUri).exists);
}
