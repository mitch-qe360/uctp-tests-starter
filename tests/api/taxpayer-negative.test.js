// Card 01 · TRN-01 · Register a taxpayer · API · negative tests
// From charters/card-01-charter.json, nodes with status "API test".
const { api, check, finish, newMobile } = require('../../helpers/api-client');

const NAME_MSG = "2-100 characters: letters, spaces, . - ' and Ñ only";
const MOBILE_MSG = 'must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX';

(async () => {
  // T4 · Syntax − · Mobile with 10 digits
  const t4 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ana Dela Cruz', mobile: '0917123456' });
  check('T4', 'Mobile with 10 digits', `422 {"detail":{"mobile":"${MOBILE_MSG}"}}`,
    t4, t4.status === 422 && t4.body?.detail?.mobile === MOBILE_MSG);

  // T5 · Syntax − · A digit in the name
  const t5 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ana 2', mobile: newMobile() });
  check('T5', 'A digit in the name', `422 {"detail":{"full_name":"${NAME_MSG}"}}`,
    t5, t5.status === 422 && t5.body?.detail?.full_name === NAME_MSG);

  // T6 · Claims − · Same mobile a second time (setup: register it once first)
  const mobile = newMobile();
  const setup = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ana Dela Cruz', mobile });
  if (setup.status !== 201) {
    check('SETUP', 'Create the first taxpayer', '201', setup, false);
    return finish('taxpayer-negative');
  }
  const t6 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ben Dela Cruz', mobile });
  check('T6', 'Same mobile a second time', '409 {"detail":{"mobile":"already registered for this tenant"}}',
    t6, t6.status === 409 && t6.body?.detail?.mobile === 'already registered for this tenant');

  // T9 · Numbers − · Name of 101 letters (one too many)
  const t9 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'A'.repeat(101), mobile: newMobile() });
  check('T9', 'Name of 101 letters (one too many)', `422 {"detail":{"full_name":"${NAME_MSG}"}}`,
    t9, t9.status === 422 && t9.body?.detail?.full_name === NAME_MSG);

  finish('taxpayer-negative');
})();
