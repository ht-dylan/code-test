import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { seedApplications } from '$lib/features/applications/data/mock';
import ApplicationSummary from './ApplicationSummary.svelte';

describe('ApplicationSummary', () => {
  it('renders the application details as a description list', () => {
    const application = seedApplications[0];
    const { container } = render(ApplicationSummary, { props: { application } });

    expect(container.querySelector('dl')).toBeInTheDocument();
    expect(screen.getByText(application.applicant.name)).toBeInTheDocument();
    expect(screen.getByText(`${application.travel.origin} → ${application.travel.destination}`)).toBeInTheDocument();
    expect(screen.getByText('¥3,200.00')).toBeInTheDocument();
    expect(screen.getByText('已通过')).toBeInTheDocument();
  });
});
