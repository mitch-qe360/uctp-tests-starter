// Card 01 · TRN-01 · Register a taxpayer · API · positive tests (+, should work)
// From charters/card-01-charter.json, nodes with status "API test": T1 to T11.
const { api, check, finish, newMobile, ME } = require('../../helpers/api-client');

const URL = '/api/v1/training/taxpayers';

(async () => {
  const mobile = newMobile();

  // T1 · + · AC-1 · create a taxpayer
  const t1 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile });
  const b1 = t1.body || {};
  check('T1', 'AC-1 · create a taxpayer', `201, full_name "Ana Dela Cruz", mobile ${mobile}, email null, has taxpayer_id and created_at`,
    t1, t1.status === 201 && b1.full_name === 'Ana Dela Cruz' && b1.mobile === mobile && b1.email === null
      && !!b1.taxpayer_id && !!b1.created_at);
  if (t1.status !== 201) return finish('taxpayer-positive');   // no taxpayer: T2 and T3 can't run

  // T2 · + · AC-2 · read my taxpayer back
  const t2 = await api('GET', `${URL}/${b1.taxpayer_id}`);
  const b2 = t2.body || {};
  check('T2', 'AC-2 · read my taxpayer back', '200, the same taxpayer_id, full_name, mobile, email, created_at as T1',
    t2, t2.status === 200 && b2.taxpayer_id === b1.taxpayer_id && b2.full_name === b1.full_name
      && b2.mobile === b1.mobile && b2.email === b1.email && b2.created_at === b1.created_at);

  // T3 · + · AC-2 · my list holds it
  const t3 = await api('GET', URL);
  const row = Array.isArray(t3.body) ? t3.body.find(r => r.taxpayer_id === b1.taxpayer_id) : undefined;
  check('T3', 'AC-2 · my list holds it', `200, a row with the same taxpayer_id, full_name, mobile, and created_by ${ME}`,
    { status: t3.status, row }, t3.status === 200 && !!row && row.full_name === 'Ana Dela Cruz'
      && row.mobile === mobile && row.created_by === ME);

  // T4 · + · AC-3 · spaces around the name are removed
  const t4 = await api('POST', URL, { full_name: '  Ana Dela Cruz  ', mobile: newMobile() });
  check('T4', 'AC-3 · spaces around the name are removed', '201, full_name "Ana Dela Cruz"',
    t4, t4.status === 201 && t4.body?.full_name === 'Ana Dela Cruz');

  // T5 · + · AC-5 · 2 letters (the lower limit)
  const t5 = await api('POST', URL, { full_name: 'Al', mobile: newMobile() });
  check('T5', 'AC-5 · 2 letters (the lower limit)', '201, full_name "Al"',
    t5, t5.status === 201 && t5.body?.full_name === 'Al');

  // T6 · + · AC-5 · 100 letters (the upper limit)
  const t6 = await api('POST', URL, { full_name: 'A'.repeat(100), mobile: newMobile() });
  check('T6', 'AC-5 · 100 letters (the upper limit)', '201, full_name is the 100 letters',
    { status: t6.status, length: t6.body?.full_name?.length }, t6.status === 201 && t6.body?.full_name === 'A'.repeat(100));

  // T7 · + · AC-5 · Ñ and . - ' are allowed
  const t7 = await api('POST', URL, { full_name: "Ñoño O'Brien-Cruz Jr.", mobile: newMobile() });
  check('T7', "AC-5 · Ñ and . - ' are allowed", `201, full_name "Ñoño O'Brien-Cruz Jr."`,
    t7, t7.status === 201 && t7.body?.full_name === "Ñoño O'Brien-Cruz Jr.");

  // T8 · + · AC-6 · email left blank
  const t8 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: '' });
  check('T8', 'AC-6 · email left blank', '201, email null',
    t8, t8.status === 201 && t8.body?.email === null);

  // T9 · + · AC-6 · a normal email
  const t9 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: 'rosa@example.com' });
  check('T9', 'AC-6 · a normal email', '201, email "rosa@example.com"',
    t9, t9.status === 201 && t9.body?.email === 'rosa@example.com');

  // T10 · + · AC-6 · 254 characters (the limit)
  const email254 = `${'a'.repeat(242)}@example.com`;
  const t10 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: email254 });
  check('T10', 'AC-6 · 254 characters (the limit)', '201, email is the 254 characters',
    { status: t10.status, length: t10.body?.email?.length }, t10.status === 201 && t10.body?.email === email254);

  // T11 · + · AC-8 · +639 + 9 digits
  const nine = newMobile().slice(2);
  const t11 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: `+639${nine}` });
  check('T11', 'AC-8 · +639 + 9 digits', `201, mobile saved as 09${nine}`,
    t11, t11.status === 201 && t11.body?.mobile === `09${nine}`);

  finish('taxpayer-positive');
})();
