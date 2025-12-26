import { deflateSync, inflateSync } from 'fflate';

/**
 * Compress data using deflate algorithm
 * @param data - Binary data to compress
 * @returns Compressed binary data
 */
export function compress(data: Uint8Array): Uint8Array {
  return deflateSync(data, { level: 9 });
}

/**
 * Decompress data using inflate algorithm
 * @param data - Compressed binary data
 * @returns Decompressed binary data
 */
export function decompress(data: Uint8Array): Uint8Array {
  return inflateSync(data);
}

/**
 * Convert binary data to base64url encoding (URL-safe)
 * @param data - Binary data to encode
 * @returns Base64url encoded string
 */
export function toBase64Url(data: Uint8Array): string {
  // Convert Uint8Array to binary string
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  // Use browser's btoa for base64 encoding
  const base64 = btoa(binary);
  // Convert to URL-safe base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64url string back to binary data
 * @param str - Base64url encoded string
 * @returns Binary data
 */
export function fromBase64Url(str: string): Uint8Array {
  // Convert base64url to standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding back
  while (base64.length % 4) {
    base64 += '=';
  }
  // Use browser's atob for base64 decoding
  const binary = atob(base64);
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
