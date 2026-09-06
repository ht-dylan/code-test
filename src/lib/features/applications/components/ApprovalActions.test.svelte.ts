import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { mockPeople, seedApplications } from '../data/mock';
import type { Person, TravelApplication, WorkflowAction } from '../domain/types';
import ApprovalActions from './ApprovalActions.svelte';

const alice = mockPeople.find(({ id }) => id === 'p-alice') as Person;
const manager = mockPeople.find(({ id }) => id === 'p-manager') as Person;
const finance = mockPeople.find(({ id }) => id === 'p-finance') as Person;
const draft = seedApplications.find(
  ({ status, applicant }) => status === 'draft' && applicant.id === alice.id
) as TravelApplication;
const managerPending = seedApplications.find(
  ({ status }) => status === 'pending_manager'
) as TravelApplication;
const financePending = seedApplications.find(
  ({ status }) => status === 'pending_finance'
) as TravelApplication;

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.open = true;
});
const closeModal = vi.fn(function (this: HTMLDialogElement) {
  this.open = false;
});
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: { configurable: true, value: showModal },
  close: { configurable: true, value: closeModal }
});

function visibleActions(application: TravelApplication, actor: Person): string[] {
  const view = render(ApprovalActions, {
    props: { application, actor, onAction: vi.fn() }
  });
  const labels = ['提交申请', '通过申请', '驳回申请', '撤回申请'].filter((label) =>
    screen.queryByRole('button', { name: label })
  );
  view.unmount();
  return labels;
}

describe('ApprovalActions', () => {
  it('shows only applicant actions returned by allowedActions', () => {
    expect(visibleActions(draft, alice)).toEqual(['提交申请']);
    expect(visibleActions(managerPending, managerPending.applicant)).toEqual(['撤回申请']);
    expect(visibleActions(financePending, alice)).toEqual([]);
  });

  it('shows only manager actions returned by allowedActions', () => {
    expect(visibleActions(draft, manager)).toEqual([]);
    expect(visibleActions(managerPending, manager)).toEqual(['通过申请', '驳回申请']);
    expect(visibleActions(financePending, manager)).toEqual([]);
  });

  it('shows only finance actions returned by allowedActions', () => {
    expect(visibleActions(draft, finance)).toEqual([]);
    expect(visibleActions(managerPending, finance)).toEqual([]);
    expect(visibleActions(financePending, finance)).toEqual(['通过申请', '驳回申请']);
  });

  it.each(['approved', 'rejected', 'withdrawn'] as const)(
    'shows no actions for terminal state %s',
    (status) => {
      expect(visibleActions({ ...draft, status }, alice)).toEqual([]);
      expect(visibleActions({ ...draft, status }, manager)).toEqual([]);
      expect(visibleActions({ ...draft, status }, finance)).toEqual([]);
    }
  );

  it('requires a rejection reason and submits the trimmed valid reason', async () => {
    const onAction = vi.fn();
    render(ApprovalActions, {
      props: { application: managerPending, actor: manager, onAction }
    });

    await fireEvent.click(screen.getByRole('button', { name: '驳回申请' }));
    expect(screen.getByRole('dialog', { name: '驳回申请' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: '确认驳回' }));
    expect(screen.getByText('请输入驳回原因')).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    await fireEvent.input(screen.getByLabelText('驳回原因'), {
      target: { value: '  预算说明不完整  ' }
    });
    await fireEvent.click(screen.getByRole('button', { name: '确认驳回' }));

    expect(onAction).toHaveBeenCalledWith('reject', '预算说明不完整');
  });

  it.each([
    ['approve', managerPending, manager, '通过申请', '确认通过'],
    ['withdraw', managerPending, managerPending.applicant, '撤回申请', '确认撤回']
  ] as [WorkflowAction, TravelApplication, Person, string, string][])(
    'confirms %s before invoking the action',
    async (action, application, actor, triggerLabel, confirmLabel) => {
      const onAction = vi.fn();
      render(ApprovalActions, { props: { application, actor, onAction } });

      await fireEvent.click(screen.getByRole('button', { name: triggerLabel }));
      expect(onAction).not.toHaveBeenCalled();

      await fireEvent.click(screen.getByRole('button', { name: confirmLabel }));
      expect(onAction).toHaveBeenCalledWith(action, '');
    }
  );

  it('traps rejection-dialog focus, closes on Escape, and restores the reject trigger', async () => {
    render(ApprovalActions, {
      props: { application: managerPending, actor: manager, onAction: vi.fn() }
    });
    const trigger = screen.getByRole('button', { name: '驳回申请' });
    trigger.focus();

    await fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '驳回申请' });
    const reason = screen.getByLabelText('驳回原因');
    const confirm = screen.getByRole('button', { name: '确认驳回' });
    await waitFor(() => expect(reason).toHaveFocus());
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(showModal).toHaveBeenCalled();

    await fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    await fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(reason).toHaveFocus();

    await fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '驳回申请' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps confirmation-dialog focus, closes on Escape, and restores the exact trigger', async () => {
    render(ApprovalActions, {
      props: { application: managerPending, actor: manager, onAction: vi.fn() }
    });
    const trigger = screen.getByRole('button', { name: '通过申请' });
    trigger.focus();

    await fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '确认通过申请' });
    const cancel = screen.getByRole('button', { name: '取消' });
    const confirm = screen.getByRole('button', { name: '确认通过' });
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(showModal).toHaveBeenCalled();

    await fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    await fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    await fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: '确认通过申请' })
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
