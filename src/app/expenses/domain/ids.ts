import type { Brand } from '@pp/shared/kernel';

export type ExpenseId = Brand<string, 'ExpenseId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type PaymentMethodId = Brand<string, 'PaymentMethodId'>;

export const expenseId = (value: string): ExpenseId => value as ExpenseId;
export const categoryId = (value: string): CategoryId => value as CategoryId;
export const paymentMethodId = (value: string): PaymentMethodId => value as PaymentMethodId;
