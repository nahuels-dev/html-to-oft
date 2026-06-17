export function substgStreamName(propertyId: number, propertyType: number): string {
  const id = propertyId.toString(16).toUpperCase().padStart(4, '0');
  const type = propertyType.toString(16).toUpperCase().padStart(4, '0');
  return `__substg1.0_${id}${type}`;
}

export const PROPERTIES_STREAM_NAME = '__properties_version1.0';

export function attachmentStorageName(index: number): string {
  return `__attach_version1.0_#${index.toString(16).toUpperCase().padStart(8, '0')}`;
}
