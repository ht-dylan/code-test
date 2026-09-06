import { describe, expect, it } from 'vitest';
import type { Person, TravelFormDraft } from './types';
import { validateDraft } from './validation';

const validApplicant: Person = {
  id: 'person-1',
  employeeNo: 'E001',
  name: '张三',
  department: '产品部',
  title: '产品经理',
  contact: '13800138000',
  role: 'applicant'
};

const validDraft: TravelFormDraft = {
  applicantId: validApplicant.id,
  origin: '上海',
  destination: '北京',
  startDate: '2026-09-05',
  endDate: '2026-09-06',
  purpose: '客户拜访',
  transport: '高铁',
  budget: 1000,
  notes: ''
};

describe('validateDraft', () => {
  it('rejects blank required values after trimming', () => {
    const errors = validateDraft(
      {
        ...validDraft,
        origin: '  ',
        destination: '',
        startDate: ' ',
        endDate: '\t',
        purpose: '\t',
        transport: ''
      },
      '2026-09-05',
      validApplicant
    );

    expect(errors).toMatchObject({
      origin: '请输入出发地',
      destination: '请输入目的地',
      startDate: '请选择开始日期',
      endDate: '请选择结束日期',
      purpose: '请输入出差事由',
      transport: '请选择交通方式'
    });
  });

  it('rejects a start date before today', () => {
    expect(
      validateDraft({ ...validDraft, startDate: '2026-09-04' }, '2026-09-05', validApplicant)
        .startDate
    ).toBe('开始日期不能早于今天');
  });

  it('rejects an end date before the start date', () => {
    expect(
      validateDraft({ ...validDraft, endDate: '2026-09-04' }, '2026-09-05', validApplicant).endDate
    ).toBe('结束日期不能早于开始日期');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, null])(
    'rejects a non-positive or non-finite budget: %s',
    (budget) => {
      expect(validateDraft({ ...validDraft, budget }, '2026-09-05', validApplicant).budget).toBe(
        '预计预算必须大于 0'
      );
    }
  );

  it('requires an applicant', () => {
    expect(validateDraft(validDraft, '2026-09-05', undefined).applicantId).toBe('请选择申请人');
  });

  it.each(['12345', 'foo@', '  '])('rejects an invalid applicant contact: %s', (contact) => {
    expect(
      validateDraft(validDraft, '2026-09-05', { ...validApplicant, contact }).applicantId
    ).toBe('申请人联系方式无效');
  });

  it('accepts an applicant with an email address', () => {
    const applicant = { ...validApplicant, contact: 'zhang.san@example.com' };

    expect(validateDraft(validDraft, '2026-09-05', applicant)).toEqual({});
  });

  it('returns no errors for a valid draft', () => {
    expect(validateDraft(validDraft, '2026-09-05', validApplicant)).toEqual({});
  });
});
