import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { API_URL } from './api';

/** Pictures are resized on the phone so uploads stay small on mobile data. */
const MAX_SIDE = 768;

export interface PickedImage {
  uri: string;
}

/** The API answers with paths like `/images/…`; external URLs pass through. */
export function imageUrl(path: string | null | undefined) {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

/** Opens the photo library with a square crop; null when the user cancels. */
export async function pickSquareImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];

  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_SIDE || asset.height > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: saved.uri };
}

/** Multipart body with the picture in the `file` field the API expects. */
export async function imageForm(image: PickedImage) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // On the web the manipulator returns a blob/data URI
    form.append('file', await (await fetch(image.uri)).blob(), 'image.jpg');
  } else {
    form.append('file', { uri: image.uri, name: 'image.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  return form;
}
