import { fireEvent, render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AppShell from '$lib/components/AppShell.svelte';
import { mockPeople, seedApplications } from '$lib/features/applications/data/mock';
import { ApplicationRepository } from '$lib/features/applications/data/repository';
import type { TravelApplication } from '$lib/features/applications/domain/types';
import { createApplicationStore } from '$lib/features/applications/state/application-store.svelte';
import { createDraftStore } from '$lib/features/applications/state/draft-store.svelte';
import { createRoleState } from '$lib/features/applications/state/role-state.svelte';
import ApplicationsPage from './applications/+page.svelte';
import ApplicationDetailPage from './applications/[id]/+page.svelte';
import EditApplicationPage from './applications/[id]/edit/+page.svelte';
import NewApplicationPage from './applications/new/+page.svelte';
import PreviewApplicationPage from './applications/preview/+page.svelte';

const TODAY = '2026-09-05';

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

function createFlow() {
  const storage = new MemoryStorage();
  const repository = new ApplicationRepository(storage);
  repository.save([]);

  let tick = 0;
  const clock = () => {
    tick += 1;
    return `2026-09-05T1${tick}:00:00.000Z`;
  };
  let created = 0;

  const roleState = createRoleState(mockPeople);
  const draftStore = createDraftStore({ people: mockPeople, today: () => TODAY });
  const applicationStore = createApplicationStore({
    repository,
    people: mockPeople,
    currentActor: () => roleState.currentPerson,
    createId: () => `app-flow-${(created += 1)}`,
    now: clock
  });
  applicationStore.initialize();

  let view: { unmount: () => void } | null = null;
  let requested: string | null = null;
  const navigate = (path: string) => {
    requested = path;
  };

  function open(path: string): void {
    view?.unmount();
    requested = null;
    window.history.replaceState({}, '', path);

    const route = path.split('#')[0];
    if (route === '/applications/new') {
      view = render(NewApplicationPage, {
        props: { draftStore, applicationStore, people: mockPeople, navigate }
      });
    } else if (route === '/applications/preview') {
      view = render(PreviewApplicationPage, {
        props: {
          draftStore,
          applicationStore,
          people: mockPeople,
          navigate,
          validationDate: TODAY
        }
      });
    } else if (route === '/applications') {
      view = render(ApplicationsPage, {
        props: { applicationStore, roleState, people: mockPeople }
      });
    } else if (route.endsWith('/edit')) {
      view = render(EditApplicationPage, {
        props: {
          applicationId: route.replace('/applications/', '').replace('/edit', ''),
          draftStore,
          applicationStore,
          roleState,
          people: mockPeople,
          navigate
        }
      });
    } else {
      view = render(ApplicationDetailPage, {
        props: {
          applicationId: route.replace('/applications/', ''),
          applicationStore,
          roleState,
          people: mockPeople
        }
      });
    }
  }

  function followNavigation(): string {
    if (!requested) throw new Error('没有待跳转的地址');
    const path = requested;
    open(path);
    return path;
  }

  function follow(link: HTMLElement): void {
    const href = link.getAttribute('href');
    if (!href) throw new Error('链接缺少地址');
    open(href);
  }

  function cleanup(): void {
    view?.unmount();
    view = null;
  }

  return {
    applicationStore,
    roleState,
    repository,
    storage,
    open,
    follow,
    followNavigation,
    cleanup,
    requestedPath: () => requested
  };
}

type Flow = ReturnType<typeof createFlow>;

let flow: Flow;

async function fillForm(overrides: { applicantId?: string; destination?: string } = {}) {
  await fireEvent.change(screen.getByLabelText('申请人'), {
    target: { value: overrides.applicantId ?? 'p-alice' }
  });
  await fireEvent.input(screen.getByLabelText('出发地'), { target: { value: '上海' } });
  await fireEvent.input(screen.getByLabelText('目的地'), {
    target: { value: overrides.destination ?? '北京' }
  });
  await fireEvent.input(screen.getByLabelText('开始日期'), { target: { value: '2026-09-20' } });
  await fireEvent.input(screen.getByLabelText('结束日期'), { target: { value: '2026-09-22' } });
  await fireEvent.input(screen.getByLabelText('出差事由'), { target: { value: '客户拜访' } });
  await fireEvent.change(screen.getByLabelText('交通方式'), { target: { value: '高铁' } });
  await fireEvent.input(screen.getByLabelText('预计预算（元）'), { target: { value: '3000' } });
}

async function click(name: string) {
  await fireEvent.click(screen.getByRole('button', { name }));
}

async function selectRole(personId: string) {
  await fireEvent.change(screen.getByLabelText('当前角色'), { target: { value: personId } });
}

async function submitThroughPreview(): Promise<string> {
  flow.open('/applications/new');
  await fillForm();
  await click('预览申请');
  flow.followNavigation();
  await click('确认提交');
  return flow.followNavigation().replace('/applications/', '');
}

beforeEach(() => {
  flow = createFlow();
});

afterEach(() => {
  flow.cleanup();
});

describe('travel application end-to-end flows', () => {
  it('saves a persistent draft and submits it from its detail page', async () => {
    flow.open('/applications/new');
    await fillForm();

    await click('保存草稿');
    const detailPath = flow.followNavigation();

    expect(detailPath).toBe('/applications/app-flow-1');
    expect(new ApplicationRepository(flow.storage).load()).toHaveLength(1);
    expect(screen.getByText('草稿')).toBeInTheDocument();

    await click('提交申请');

    expect(screen.getByText('待主管审批')).toBeInTheDocument();
    expect(screen.getByText('提交申请')).toBeInTheDocument();
    expect(flow.applicationStore.applications[0].status).toBe('pending_manager');
  });

  it('resumes a saved draft, edits it, and submits the same application', async () => {
    flow.open('/applications/new');
    await fillForm();
    await click('保存草稿');
    flow.followNavigation();

    const editLink = screen.getByRole('link', { name: '继续编辑' });
    expect(editLink).toHaveAttribute('href', '/applications/app-flow-1/edit');
    flow.follow(editLink);

    await fireEvent.input(screen.getByLabelText('目的地'), { target: { value: '杭州' } });
    await click('预览申请');
    flow.followNavigation();

    expect(screen.getByText('上海 → 杭州')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '编辑行程信息' })).toHaveAttribute(
      'href',
      '/applications/app-flow-1/edit#travel'
    );

    await click('确认提交');
    flow.followNavigation();

    expect(flow.applicationStore.applications).toHaveLength(1);
    expect(flow.applicationStore.applications[0]).toMatchObject({
      id: 'app-flow-1',
      status: 'pending_manager',
      travel: expect.objectContaining({ destination: '杭州' })
    });
  });

  it('returns from preview to the applicant section, changes the applicant, and submits', async () => {
    flow.open('/applications/new');
    await fillForm();
    await click('预览申请');
    flow.followNavigation();

    expect(screen.getByText('陈晓')).toBeInTheDocument();

    const editLink = screen.getByRole('link', { name: '编辑申请人信息' });
    expect(editLink).toHaveAttribute('href', '/applications/new#applicant');
    flow.follow(editLink);

    await fireEvent.change(screen.getByLabelText('申请人'), { target: { value: 'p-bob' } });
    await click('预览申请');
    flow.followNavigation();

    expect(screen.getByText('林悦')).toBeInTheDocument();

    await click('确认提交');
    flow.followNavigation();

    expect(screen.getByText('待主管审批')).toBeInTheDocument();
    expect(flow.applicationStore.applications[0].applicant.name).toBe('林悦');
  });

  it('records manager and finance approvals and shows the application as approved', async () => {
    const id = await submitThroughPreview();

    await selectRole('p-manager');
    await click('通过申请');
    await click('确认通过');

    expect(screen.getByText('待财务审批')).toBeInTheDocument();

    await selectRole('p-finance');
    await click('通过申请');
    await click('确认通过');

    flow.open(`/applications/${id}`);

    expect(screen.getByText('已通过')).toBeInTheDocument();
    expect(screen.getByText('王经理')).toBeInTheDocument();
    expect(screen.getByText('孙会计')).toBeInTheDocument();
  });

  it('shows the exact rejection reason on the applicant detail page', async () => {
    const id = await submitThroughPreview();

    await selectRole('p-manager');
    await click('驳回申请');
    await fireEvent.input(screen.getByLabelText('驳回原因'), {
      target: { value: '预算超出部门额度' }
    });
    await click('确认驳回');

    await selectRole('p-alice');
    flow.open(`/applications/${id}`);

    expect(screen.getByText('已驳回')).toBeInTheDocument();
    expect(screen.getByText('预算超出部门额度')).toBeInTheDocument();
  });

  it('restores seed applications when demo data is reset from the shell', async () => {
    await submitThroughPreview();
    flow.cleanup();

    render(AppShell, {
      props: {
        currentPath: '/',
        warning: null,
        onreset: () => flow.applicationStore.reset()
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await click('重置演示数据');
    await click('确认重置');

    expect(screen.getByText('演示数据已重置')).toBeInTheDocument();
    expect(flow.applicationStore.applications).toHaveLength(seedApplications.length);
    expect(
      new ApplicationRepository(flow.storage).load().map(({ id }: TravelApplication) => id)
    ).toEqual(seedApplications.map(({ id }) => id));
  });

  it('announces repository recovery warnings through a polite live region', () => {
    render(AppShell, {
      props: { currentPath: '/', warning: '本地数据异常，已恢复演示数据' }
    });

    const liveRegion = screen.getByText('本地数据异常，已恢复演示数据').closest('[aria-live]');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
