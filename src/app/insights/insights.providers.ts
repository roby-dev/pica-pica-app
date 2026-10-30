import { makeEnvironmentProviders } from '@angular/core';
import { INSIGHTS_SOURCE } from './application/ports/insights-source';
import { ExpensesInsightsSource } from './infrastructure/expenses-insights-source';

/** Connects insights to the expenses and settings features through its own port. */
export function provideInsights() {
  return makeEnvironmentProviders([{ provide: INSIGHTS_SOURCE, useClass: ExpensesInsightsSource }]);
}
