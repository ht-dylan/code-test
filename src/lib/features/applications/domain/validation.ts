import type { Person, TravelFormDraft, ValidationErrors } from './types';

const chineseMobilePattern = /^1[3-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDraft(
  draft: TravelFormDraft,
  today: string,
  applicant: Person | undefined
): ValidationErrors {
  const errors: ValidationErrors = {};
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate.trim();

  if (!draft.applicantId.trim() || !applicant) {
    errors.applicantId = '请选择申请人';
  } else {
    const contact = applicant.contact.trim();
    if (!chineseMobilePattern.test(contact) && !emailPattern.test(contact)) {
      errors.applicantId = '申请人联系方式无效';
    }
  }

  if (!draft.origin.trim()) errors.origin = '请输入出发地';
  if (!draft.destination.trim()) errors.destination = '请输入目的地';
  if (!startDate) errors.startDate = '请选择开始日期';
  if (!endDate) errors.endDate = '请选择结束日期';
  if (!draft.purpose.trim()) errors.purpose = '请输入出差事由';
  if (!draft.transport) errors.transport = '请选择交通方式';

  if (startDate && startDate < today) {
    errors.startDate = '开始日期不能早于今天';
  }

  if (startDate && endDate && endDate < startDate) {
    errors.endDate = '结束日期不能早于开始日期';
  }

  if (draft.budget === null || !Number.isFinite(draft.budget) || draft.budget <= 0) {
    errors.budget = '预计预算必须大于 0';
  }

  return errors;
}
