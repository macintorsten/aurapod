import { describe, it, expect } from 'vitest';
import { compress, decompress, toBase64Url, fromBase64Url } from './compressor';

describe('compressor', () => {
  describe('compress and decompress', () => {
    it('should compress and decompress data correctly', () => {
      const original = new TextEncoder().encode('Hello, World!');
      const compressed = compress(original);
      const decompressed = decompress(compressed);
      
      expect(decompressed).toEqual(original);
      expect(new TextDecoder().decode(decompressed)).toBe('Hello, World!');
    });
    
    it('should reduce data size with compression', () => {
      const largeText = 'a'.repeat(1000);
      const original = new TextEncoder().encode(largeText);
      const compressed = compress(original);
      
      expect(compressed.length).toBeLessThan(original.length);
    });
  });
  
  describe('base64url encoding', () => {
    it('should encode and decode base64url correctly', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const encoded = toBase64Url(data);
      const decoded = fromBase64Url(encoded);
      
      expect(decoded).toEqual(data);
    });
    
    it('should produce URL-safe characters', () => {
      const data = new Uint8Array([255, 254, 253, 252, 251]);
      const encoded = toBase64Url(data);
      
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });
  });
  
  describe('roundtrip', () => {
    it('should handle empty data', () => {
      const original = new Uint8Array([]);
      const compressed = compress(original);
      const encoded = toBase64Url(compressed);
      const decoded = fromBase64Url(encoded);
      const decompressed = decompress(decoded);
      
      expect(decompressed).toEqual(original);
    });
    
    it('should handle binary data', () => {
      const original = new Uint8Array([0, 255, 128, 64, 32, 16, 8, 4, 2, 1]);
      const compressed = compress(original);
      const encoded = toBase64Url(compressed);
      const decoded = fromBase64Url(encoded);
      const decompressed = decompress(decoded);
      
      expect(decompressed).toEqual(original);
    });
  });
});
