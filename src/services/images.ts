import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

const MACHINE_IMAGES_DIR = `${FileSystem.documentDirectory}machine-images/`;

export async function ensureMachineImagesDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MACHINE_IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MACHINE_IMAGES_DIR, { intermediates: true });
  }
}

export function getMachineImageUri(imageFilename: string | null): string | null {
  if (!imageFilename) return null;
  return `${MACHINE_IMAGES_DIR}${imageFilename}`;
}

export function generateImageFilename(extension = 'jpg'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `machine_${Date.now()}_${random}.${extension}`;
}

export async function saveMachineImageFromPicker(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload machine images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets[0]) return null;

  await ensureMachineImagesDir();
  const extension = result.assets[0].uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filename = generateImageFilename(extension);
  await FileSystem.copyAsync({
    from: result.assets[0].uri,
    to: `${MACHINE_IMAGES_DIR}${filename}`,
  });
  return filename;
}

export async function deleteMachineImage(imageFilename: string | null): Promise<void> {
  if (!imageFilename) return;
  const uri = getMachineImageUri(imageFilename);
  if (!uri) return;
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

export function getMachineImagesDir(): string {
  return MACHINE_IMAGES_DIR;
}
