// Card 01 · TRN-01 · Register a taxpayer · API · security tests (who may see what)
// From charters/card-01-charter.json, nodes with status "API test": A31 to A34.
const { api, check, finish, newMobile, AS_PROBE, NO_USER, AS_OTHER_CASE } = require('../../helpers/api-client');

const URL = '/api/v1/training/taxpayers';

(async () => {
  // Setup: my own taxpayer
  const setup = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile() });
  if (setup.status !== 201) {
    check('SETUP', 'Create my taxpayer', '201', setup, false);
    return finish('taxpayer-security');
  }
  const id = setup.body.taxpayer_id;

  // A31 · − · AC-7 · another user asks for my taxpayer
  const t31 = await api('GET', `${URL}/${id}`, undefined, AS_PROBE);
  check('A31', 'AC-7 · another user asks for my taxpayer', '404 {"detail":"Not Found"}',
    t31, t31.status === 404 && t31.body?.detail === 'Not Found');

  // A32 · − · AC-7 · another user's list
  const t32 = await api('GET', URL, undefined, AS_PROBE);
  const leaked = Array.isArray(t32.body) && t32.body.some(r => r.taxpayer_id === id);
  check('A32', "AC-7 · another user's list", '200, and my taxpayer_id is not in it',
    { status: t32.status, rows: Array.isArray(t32.body) ? t32.body.length : t32.body, leaked },
    t32.status === 200 && Array.isArray(t32.body) && !leaked);

  // A33 · − · AC-7 · my name-tag in other letter case is another user
  const t33 = await api('GET', `${URL}/${id}`, undefined, AS_OTHER_CASE);
  check('A33', 'AC-7 · my name-tag in other letter case is another user', '404 {"detail":"Not Found"}',
    t33, t33.status === 404 && t33.body?.detail === 'Not Found');

  // A34 · − · no X-User-ID header
  const t34 = await api('GET', `${URL}/${id}`, undefined, NO_USER);
  check('A34', 'no X-User-ID header', '422 {"detail":{"X-User-ID":"required header"}}',
    t34, t34.status === 422 && t34.body?.detail?.['X-User-ID'] === 'required header');

  finish('taxpayer-security');
})();
