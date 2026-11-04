const { api, check, finish, newMobile, newPin, newReference, AS_PROBE, NO_USER, AS_OTHER_CASE, ME } = require('../../helpers/api-client');

(async () => {
  const URL = '/api/v1/training/taxpayers';

  // Setup: my own taxpayer
  const setup = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile() });
  const mine = (setup.body || {}).taxpayer_id;
  if (setup.status !== 201 || !mine) {
    check('SETUP', 'create my taxpayer', '201 with a taxpayer_id', setup, false);
    return finish('card-01-security');
  }

  // T31 · − · AC-7 · another user asks for my taxpayer
  const t31 = await api('GET', `${URL}/${mine}`, undefined, AS_PROBE);
  check('T31', 'AC-7 · another user asks for my taxpayer', '404 {"detail":"Not Found"}',
    t31, t31.status === 404 && (t31.body || {}).detail === 'Not Found');

  // T32 · − · AC-7 · another user's list
  const t32 = await api('GET', URL, undefined, AS_PROBE);
  const rows32 = Array.isArray(t32.body) ? t32.body : null;
  check('T32', "AC-7 · another user's list", '200, and my taxpayer_id is not in it',
    t32, t32.status === 200 && rows32 !== null && !rows32.some((r) => r.taxpayer_id === mine));

  // T33 · − · AC-7 · my name-tag in other letter case is another user
  const t33 = await api('GET', `${URL}/${mine}`, undefined, AS_OTHER_CASE);
  check('T33', 'AC-7 · my name-tag in other letter case is another user', '404 {"detail":"Not Found"}',
    t33, t33.status === 404 && (t33.body || {}).detail === 'Not Found');

  // T34 · − · no X-User-ID header
  const t34 = await api('GET', `${URL}/${mine}`, undefined, NO_USER);
  const d34 = (t34.body && t34.body.detail) || {};
  check('T34', 'no X-User-ID header', '422 {"detail":{"X-User-ID":"required header"}}',
    t34, t34.status === 422 && d34['X-User-ID'] === 'required header');

  finish('card-01-security');
})();
