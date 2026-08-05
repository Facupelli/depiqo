import { resetDatabase } from '../support/reset-database';

beforeEach(async () => {
  await resetDatabase();
});
