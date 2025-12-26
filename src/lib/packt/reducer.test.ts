import { describe, it, expect } from 'vitest';
import { reduceTrack, reduceFeed } from './reducer';
import { Track, Feed } from './types';

describe('reducer', () => {
  describe('reduceTrack', () => {
    it('should not modify track when no options provided', () => {
      const track: Track = {
        title: 'Episode Title',
        url: 'https://example.com/audio.mp3',
        description: 'A detailed description of the episode',
        date: 1735084800,
      };
      
      const result = reduceTrack(track);
      
      expect(result).toEqual(track);
    });
    
    it('should truncate title to maxTitleLength with ellipsis', () => {
      const track: Track = {
        title: 'This is a very long episode title that should be truncated',
      };
      
      const result = reduceTrack(track, { maxTitleLength: 30 });
      
      expect(result.title).toBe('This is a very long episode t…');
      expect(result.title?.length).toBe(30);
    });
    
    it('should truncate description to maxDescriptionLength with ellipsis', () => {
      const track: Track = {
        description: 'This is a very long description that should be truncated to forty characters',
      };
      
      const result = reduceTrack(track, { maxDescriptionLength: 40 });
      
      expect(result.description).toBe('This is a very long description that sh…');
      expect(result.description?.length).toBe(40);
    });
    
    it('should truncate both title and description with ellipsis', () => {
      const track: Track = {
        title: 'Long title',
        description: 'Long description',
      };
      
      const result = reduceTrack(track, {
        maxTitleLength: 5,
        maxDescriptionLength: 10,
      });
      
      expect(result.title).toBe('Long…');
      expect(result.description).toBe('Long desc…');
    });
    
    it('should not truncate if string is shorter than limit', () => {
      const track: Track = {
        title: 'Short',
        description: 'Brief',
      };
      
      const result = reduceTrack(track, {
        maxTitleLength: 100,
        maxDescriptionLength: 100,
      });
      
      expect(result.title).toBe('Short');
      expect(result.description).toBe('Brief');
    });
    
    it('should remove descriptions', () => {
      const track: Track = {
        title: 'Episode Title',
        description: 'Episode description',
      };
      
      const result = reduceTrack(track, { removeDescriptions: true });
      
      expect(result.title).toBe('Episode Title');
      expect(result.description).toBeNull();
    });
    
    it('should remove specified fields', () => {
      const track: Track = {
        title: 'Episode Title',
        description: 'Episode description',
        duration: 3600,
      };
      
      const result = reduceTrack(track, {
        removeFields: ['description', 'duration'],
      });
      
      expect(result.title).toBe('Episode Title');
      expect(result.description).toBeNull();
      expect(result.duration).toBeNull();
    });
    
    it('should combine truncation and removal', () => {
      const track: Track = {
        title: 'This is a very long title',
        description: 'This is a description',
        duration: 3600,
      };
      
      const result = reduceTrack(track, {
        maxTitleLength: 10,
        removeDescriptions: true,
      });
      
      expect(result.title).toBe('This is a…');
      expect(result.description).toBeNull();
      expect(result.duration).toBe(3600); // Not removed
    });
  });
  
  describe('reduceFeed', () => {
    it('should apply reduction to all tracks', () => {
      const feed: Feed = {
        title: 'Podcast Title',
        tracks: [
          {
            title: 'Episode 1 with a very long title',
            description: 'Description 1',
          },
          {
            title: 'Episode 2 with a very long title',
            description: 'Description 2',
          },
        ],
      };
      
      const result = reduceFeed(feed, {
        maxTitleLength: 10,
        removeDescriptions: true,
      });
      
      expect(result.tracks[0].title).toBe('Episode 1…');
      expect(result.tracks[0].description).toBeNull();
      expect(result.tracks[1].title).toBe('Episode 2…');
      expect(result.tracks[1].description).toBeNull();
    });
    
    it('should truncate feed-level properties when limits are specified', () => {
      const feed: Feed = {
        title: 'Podcast Title',
        description: 'Podcast Description',
        url: 'https://example.com',
        tracks: [],
      };
      
      const result = reduceFeed(feed, {
        maxTitleLength: 10,
      });
      
      // Feed-level title should be truncated
      expect(result.title).toBe('Podcast T…');
      expect(result.description).toBe('Podcast Description');
      expect(result.url).toBe('https://example.com');
    });
    
    it('should preserve feed-level properties without limits', () => {
      const feed: Feed = {
        title: 'Podcast Title',
        description: 'Podcast Description',
        url: 'https://example.com',
        tracks: [],
      };
      
      const result = reduceFeed(feed, {});
      
      expect(result.title).toBe('Podcast Title');
      expect(result.description).toBe('Podcast Description');
      expect(result.url).toBe('https://example.com');
    });
  });
});
