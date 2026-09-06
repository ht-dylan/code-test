import { render } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewApplicationPage from './+page.svelte';

describe('new application page', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/applications/new');
  });

  it('scrolls to the section named in the URL hash after mounting', () => {
    window.history.replaceState({}, '', '/applications/new#travel');
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(NewApplicationPage);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });
});
