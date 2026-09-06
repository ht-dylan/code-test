import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { mockPeople } from '$lib/features/applications/data/mock';
import RoleSwitcher from './RoleSwitcher.svelte';

describe('RoleSwitcher', () => {
  it('labels the current role and reports the selected person ID', async () => {
    const onchange = vi.fn();
    render(RoleSwitcher, {
      props: { people: mockPeople, selectedId: 'p-alice', onchange }
    });

    expect(screen.getByText('申请人')).toBeInTheDocument();

    await fireEvent.change(screen.getByLabelText('当前角色'), {
      target: { value: 'p-manager' }
    });

    expect(onchange).toHaveBeenCalledWith('p-manager');
  });
});
