import { TestBed } from '@angular/core/testing';
import type { ExpenseDraft } from '../domain/expense-draft';
import { categoryId, paymentMethodId } from '../domain/ids';
import { ExpenseDraftStore } from './expense-draft.store';

const blank: ExpenseDraft = {
  amountMinor: null,
  what: '',
  categoryId: null,
  paymentMethodId: null,
  place: '',
  note: '',
  occurredAt: null,
  currency: null,
};

describe('ExpenseDraftStore', () => {
  beforeEach(() => localStorage.removeItem('pp-last-method'));

  it('starts without a draft', () => {
    expect(TestBed.inject(ExpenseDraftStore).current()).toBeNull();
  });

  it('keeps what the user typed', () => {
    const store = TestBed.inject(ExpenseDraftStore);
    const draft = { ...blank, what: 'Café', categoryId: categoryId('cat-1') };
    store.save(draft);
    expect(store.current()).toEqual(draft);
  });

  it('drops a blank draft so a reset form leaves nothing behind', () => {
    const store = TestBed.inject(ExpenseDraftStore);
    store.save({ ...blank, what: 'Café' });
    store.save(blank);
    expect(store.current()).toBeNull();
  });

  it('clears on demand', () => {
    const store = TestBed.inject(ExpenseDraftStore);
    store.save({ ...blank, amountMinor: 450 });
    store.clear();
    expect(store.current()).toBeNull();
  });
});

describe('ExpenseDraftStore payment method memory', () => {
  beforeEach(() => localStorage.removeItem('pp-last-method'));

  it('does not keep a draft that only holds a payment method', () => {
    const store = TestBed.inject(ExpenseDraftStore);
    store.save({ ...blank, paymentMethodId: paymentMethodId('pm-yape-plin') });
    expect(store.current()).toBeNull();
  });

  it('remembers the last method and brings it back in a new session', () => {
    TestBed.inject(ExpenseDraftStore).rememberMethod(paymentMethodId('pm-yape-plin'));
    expect(TestBed.inject(ExpenseDraftStore).lastMethodId()).toBe('pm-yape-plin');

    TestBed.resetTestingModule();
    expect(TestBed.inject(ExpenseDraftStore).lastMethodId()).toBe('pm-yape-plin');
  });
});
