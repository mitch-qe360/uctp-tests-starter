// Card 01 · TRN-01 · Register a taxpayer · API · positive tests
// From charters/card-01-charter.json, nodes with status "API test".
const { api, check, finish, newMobile } = require('../../helpers/api-client');

(async () => {
  const mobile = newMobile();

  // T1 · Users + · Create a taxpayer with a 09 mobile
  const t1 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ana Dela Cruz', mobile });
  const b1 = t1.body || {};
  check('T1', 'Create a taxpayer with a 09 mobile', `201, full_name "Ana Dela Cruz", mobile ${mobile}, email null`,
    t1, t1.status === 201 && b1.full_name === 'Ana Dela Cruz' && b1.mobile === mobile && b1.email === null && !!b1.taxpayer_id);
  if (t1.status !== 201) return finish('taxpayer-positive');   // no taxpayer: stop

  // T2 · Core + · See my taxpayer
  const t2 = await api('GET', `/api/v1/training/taxpayers/${b1.taxpayer_id}`);
  const b2 = t2.body || {};
  check('T2', 'See my taxpayer', '200, the same 5 fields as T1',
    t2, t2.status === 200 && b2.taxpayer_id === b1.taxpayer_id && b2.full_name === 'Ana Dela Cruz'
      && b2.mobile === mobile && b2.email === null && b2.created_at === b1.created_at);

  // T3 · Data + · Spaces around the name are removed
  const t3 = await api('POST', '/api/v1/training/taxpayers', { full_name: '  Ana Dela Cruz  ', mobile: newMobile() });
  check('T3', 'Spaces around the name are removed', '201, full_name "Ana Dela Cruz"',
    t3, t3.status === 201 && (t3.body || {}).full_name === 'Ana Dela Cruz');

  // T10 · Numbers + · Name of 100 letters (the limit)
  const t10 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'A'.repeat(100), mobile: newMobile() });
  check('T10', 'Name of 100 letters (the limit)', '201, full_name is the 100 letters',
    { status: t10.status, length: (t10.body || {}).full_name?.length }, t10.status === 201 && (t10.body || {}).full_name === 'A'.repeat(100));

  finish('taxpayer-positive');
})();
