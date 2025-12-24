import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAppBaseUrl } from '../index';

describe('getAppBaseUrl', () => {
  let originalWindow: any;
  let originalDocument: any;

  beforeEach(() => {
    originalWindow = global.window;
    originalDocument = global.document;
  });

  afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
  });

  it('should use explicit config baseUrl if provided', () => {
    (global as any).window = { location: { origin: 'http://example.com', pathname: '/some/path' } };
    const result = getAppBaseUrl('https://custom.com/base');
    expect(result).toBe('https://custom.com/base');
  });

  it('should remove trailing slash from config baseUrl', () => {
    (global as any).window = { location: { origin: 'http://example.com', pathname: '/' } };
    const result = getAppBaseUrl('https://custom.com/base/');
    expect(result).toBe('https://custom.com/base');
  });

  it('should return origin when at root path', () => {
    (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/' } };
    (global as any).document = { querySelector: () => null };
    const result = getAppBaseUrl();
    expect(result).toBe('http://localhost:3000');
  });

  it('should return origin when pathname is empty', () => {
    (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '' } };
    (global as any).document = { querySelector: () => null };
    const result = getAppBaseUrl();
    expect(result).toBe('http://localhost:3000');
  });

  it('should include subfolder in base URL with hash routing', () => {
    // Simulates: http://example.com/myapp/#/podcast/feed-url
    (global as any).window = { 
      location: { 
        origin: 'http://example.com', 
        pathname: '/myapp/',
        hash: '#/podcast/feed-url'
      } 
    };
    (global as any).document = { querySelector: () => null };
    const result = getAppBaseUrl();
    expect(result).toBe('http://example.com/myapp');
  });

  it('should include deep subfolder in base URL', () => {
    // Simulates: https://site.org/apps/aurapod/#/archive
    (global as any).window = { 
      location: { 
        origin: 'https://site.org', 
        pathname: '/apps/aurapod/',
        hash: '#/archive'
      } 
    };
    (global as any).document = { querySelector: () => null };
    const result = getAppBaseUrl();
    expect(result).toBe('https://site.org/apps/aurapod');
  });

  it('should handle pathname without trailing slash', () => {
    (global as any).window = { 
      location: { 
        origin: 'http://example.com', 
        pathname: '/subfolder',
        hash: '#/'
      } 
    };
    (global as any).document = { querySelector: () => null };
    const result = getAppBaseUrl();
    expect(result).toBe('http://example.com/subfolder');
  });

  it('should remove index.html from path', () => {
    (global as any).window = { 
      location: { 
        origin: 'http://example.com', 
        pathname: '/subfolder/index.html',
        hash: '#/'
      } 
    };
    (global as any).document = { querySelector: () => null };
    const result = getAppBaseUrl();
    expect(result).toBe('http://example.com/subfolder');
  });

  it('should work at root with hash routing', () => {
    // Simulates: http://localhost:3000/#/new
    (global as any).window = { 
      location: { 
        origin: 'http://localhost:3000', 
        pathname: '/',
        hash: '#/new'
      } 
    };
    (global as any).document = { querySelector: () => null };
    const result = getAppBaseUrl();
    expect(result).toBe('http://localhost:3000');
  });

  it('should use base tag if present', () => {
    (global as any).window = { location: { origin: 'http://example.com', pathname: '/' } };
    (global as any).document = {
      querySelector: (selector: string) => {
        if (selector === 'base') {
          return { href: 'http://example.com/custom-base/' };
        }
        return null;
      }
    };
    
    const result = getAppBaseUrl();
    expect(result).toBe('http://example.com/custom-base');
  });

  it('should return empty string if window is undefined', () => {
    delete (global as any).window;
    const result = getAppBaseUrl();
    expect(result).toBe('');
  });

  it('should return empty string if window.location is undefined', () => {
    (global as any).window = {};
    const result = getAppBaseUrl();
    expect(result).toBe('');
  });

  it('should work without document defined', () => {
    (global as any).window = { location: { origin: 'http://localhost:3000', pathname: '/' } };
    delete (global as any).document;
    
    const result = getAppBaseUrl();
    expect(result).toBe('http://localhost:3000');
  });
});
