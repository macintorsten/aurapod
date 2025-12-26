import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render with title only', () => {
    render(<EmptyState title="No items found" />);
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render with default icon', () => {
    const { container } = render(<EmptyState title="Empty" />);
    
    const icon = container.querySelector('i.fa-solid.fa-inbox');
    expect(icon).toBeInTheDocument();
  });

  it('should render with custom icon', () => {
    const { container } = render(
      <EmptyState title="Empty" icon="fa-heart" />
    );
    
    const icon = container.querySelector('i.fa-solid.fa-heart');
    expect(icon).toBeInTheDocument();
  });

  it('should render with description when provided', () => {
    render(
      <EmptyState 
        title="No podcasts" 
        description="Start by searching for a podcast to subscribe to" 
      />
    );
    
    expect(screen.getByText('No podcasts')).toBeInTheDocument();
    expect(screen.getByText('Start by searching for a podcast to subscribe to')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    
    const descriptions = container.querySelectorAll('p');
    expect(descriptions).toHaveLength(0);
  });

  it('should render action button when provided', () => {
    render(
      <EmptyState 
        title="Empty" 
        action={<button>Add Item</button>} 
      />
    );
    
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('should not render action area when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    
    // Check that there's no extra div for action
    const mainDiv = container.firstChild;
    const children = mainDiv?.childNodes;
    expect(children?.length).toBe(2); // icon div + title (no description, no action)
  });

  it('should render complete state with all props', () => {
    render(
      <EmptyState 
        title="No results"
        description="Try adjusting your search"
        icon="fa-search"
        action={<button>Clear filters</button>}
      />
    );
    
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('should have correct CSS classes for styling', () => {
    const { container } = render(<EmptyState title="Test" />);
    
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('flex');
    expect(mainDiv.className).toContain('flex-col');
    expect(mainDiv.className).toContain('items-center');
  });

  it('should support ReactNode as action', () => {
    render(
      <EmptyState 
        title="Empty" 
        action={
          <div>
            <button>Action 1</button>
            <button>Action 2</button>
          </div>
        } 
      />
    );
    
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });
});
