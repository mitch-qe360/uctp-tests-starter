// Card 01 · TRN-01 · Register a taxpayer · API · security tests (who may see what)
// From charters/card-01-charter.json, nodes with status "API test".
const { api, check, finish, newMobile, AS_PROBE, NO_USER } = require('../../helpers/api-client');

(async () => {
  // Setup: my own taxpayer
  const setup = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ana Dela Cruz', mobile: newMobile() });
  if (setup.status !== 201) {
    check('SETUP', 'Create my taxpayer', '201', setup, false);
    return finish('taxpayer-security');
  }
  const id = setup.body.taxpayer_id;

  // T7 · Users − · Another user asks for my taxpayer
  const t7 = await api('GET', `/api/v1/training/taxpayers/${id}`, undefined, AS_PROBE);
  check('T7', 'Another user asks for my taxpayer', '404 {"detail":"Not Found"}',
    t7, t7.status === 404 && t7.body?.detail === 'Not Found');

  // T8 · Users − · No X-User-ID header
  const t8 = await api('GET', `/api/v1/training/taxpayers/${id}`, undefined, NO_USER);
  check('T8', 'No X-User-ID header', '422 {"detail":{"X-User-ID":"required header"}}',
    t8, t8.status === 422 && t8.body?.detail?.['X-User-ID'] === 'required header');

  finish('taxpayer-security');
})();
