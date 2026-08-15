import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../Select';

describe('Select', () => {
  it('associates its label and reports the selected value', () => {
    const onChange = vi.fn();

    render(
      <Select label="Task status" defaultValue="todo" onChange={onChange}>
        <option value="todo">To Do</option>
        <option value="done">Done</option>
      </Select>
    );

    const select = screen.getByLabelText('Task status');
    fireEvent.change(select, { target: { value: 'done' } });

    expect(select).toHaveValue('done');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
