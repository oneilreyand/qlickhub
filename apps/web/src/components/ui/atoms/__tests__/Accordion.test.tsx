import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../Accordion';

describe('Accordion Atom', () => {
  it('renders accordion items and toggles open state when clicked', () => {
    render(
      <Accordion>
        <AccordionItem id="item-1">
          <AccordionTrigger>Item 1 Header</AccordionTrigger>
          <AccordionContent>Item 1 Content</AccordionContent>
        </AccordionItem>
        <AccordionItem id="item-2">
          <AccordionTrigger>Item 2 Header</AccordionTrigger>
          <AccordionContent>Item 2 Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    expect(screen.getByText('Item 1 Header')).toBeInTheDocument();
    expect(screen.queryByText('Item 1 Content')).not.toBeInTheDocument();

    const trigger1 = screen.getByRole('button', { name: /item 1 header/i });
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');

    // Click to expand item 1
    fireEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Item 1 Content')).toBeInTheDocument();

    // Click again to collapse item 1
    fireEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Item 1 Content')).not.toBeInTheDocument();
  });

  it('honors defaultValue prop to start in expanded state', () => {
    render(
      <Accordion defaultValue={['item-open']}>
        <AccordionItem id="item-open">
          <AccordionTrigger>Open Header</AccordionTrigger>
          <AccordionContent>Already Open Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger = screen.getByRole('button', { name: /open header/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Already Open Content')).toBeInTheDocument();
  });

  it('notifies onValueChange callback when item toggles', () => {
    const onValueChange = vi.fn();
    render(
      <Accordion onValueChange={onValueChange}>
        <AccordionItem id="item-test">
          <AccordionTrigger>Test Header</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger = screen.getByRole('button', { name: /test header/i });
    fireEvent.click(trigger);

    expect(onValueChange).toHaveBeenCalledWith(['item-test']);
  });
});
