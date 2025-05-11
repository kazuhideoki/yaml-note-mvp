import React from 'react';
import { render, screen } from '@testing-library/react';
import MarkdownPreview from '../MarkdownPreview';
import { LoggerProvider } from '../../contexts/LoggerContext';

describe('MarkdownPreview', () => {
  it('renders markdown content correctly', () => {
    const markdownContent = `# Heading
    
This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

[A link](https://example.com)`;

    render(
      <LoggerProvider>
        <MarkdownPreview content={markdownContent} />
      </LoggerProvider>
    );
    
    // Check heading
    expect(screen.getByText('Heading')).toBeInTheDocument();
    
    // Check paragraph text (substring match)
    expect(screen.getByText(/This is a paragraph/)).toBeInTheDocument();
    
    // Check list items
    expect(screen.getByText('List item 1')).toBeInTheDocument();
    expect(screen.getByText('List item 2')).toBeInTheDocument();
    
    // Check link
    const link = screen.getByText('A link');
    expect(link).toBeInTheDocument();
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link.getAttribute('href')).toBe('https://example.com');
  });

  it('applies custom className', () => {
    const className = 'custom-class';
    const { container } = render(
      <LoggerProvider>
        <MarkdownPreview content="" className={className} />
      </LoggerProvider>
    );
    
    expect(container.firstChild).toHaveClass(className);
    expect(container.firstChild).toHaveClass('prose'); // Default Tailwind typography class
  });
});