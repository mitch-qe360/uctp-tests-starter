const { api, check, finish, newMobile, newPin, newReference, AS_PROBE, NO_USER, AS_OTHER_CASE, ME } = require('../../helpers/api-client');

(async () => {
  const URL = '/api/v1/training/taxpayers';

  // T1 · + · AC-1 · create a taxpayer
  const mobile = newMobile();
  const t1 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile });
  const b1 = t1.body || {};
  check('T1', 'AC-1 · create a taxpayer', `201, full_name "Ana Dela Cruz", mobile ${mobile}, email null, has taxpayer_id and created_at`,
    t1, t1.status === 201 && b1.full_name === 'Ana Dela Cruz' && b1.mobile === mobile && b1.email === null
      && !!b1.taxpayer_id && !!b1.created_at);

  // Setup for T2 and T3: they need the taxpayer made in T1
  if (!b1.taxpayer_id) {
    check('SETUP', 'create a taxpayer to read back', '201 with a taxpayer_id', t1, false);
    return finish('card-01-positive');
  }

  // T2 · + · AC-2 · read my taxpayer back
  const t2 = await api('GET', `${URL}/${b1.taxpayer_id}`);
  const b2 = t2.body || {};
  check('T2', 'AC-2 · read my taxpayer back', '200, the same taxpayer_id, full_name, mobile, email, created_at as T1',
    t2, t2.status === 200 && b2.taxpayer_id === b1.taxpayer_id && b2.full_name === b1.full_name
      && b2.mobile === b1.mobile && b2.email === b1.email && b2.created_at === b1.created_at);

  // T3 · + · AC-2 · my list holds it
  const t3 = await api('GET', URL);
  const rows3 = Array.isArray(t3.body) ? t3.body : [];
  const row3 = rows3.find((r) => r.taxpayer_id === b1.taxpayer_id) || {};
  check('T3', 'AC-2 · my list holds it', '200, a row with the same taxpayer_id, full_name, mobile, and created_by = my name-tag',
    t3, t3.status === 200 && row3.taxpayer_id === b1.taxpayer_id && row3.full_name === b1.full_name
      && row3.mobile === b1.mobile && row3.created_by === ME);

  // T4 · + · AC-3 · spaces around the name are removed
  const t4 = await api('POST', URL, { full_name: '  Ana Dela Cruz  ', mobile: newMobile() });
  const b4 = t4.body || {};
  check('T4', 'AC-3 · spaces around the name are removed', '201, full_name "Ana Dela Cruz"',
    t4, t4.status === 201 && b4.full_name === 'Ana Dela Cruz');

  // T5 · + · AC-5 · 2 letters (the lower limit)
  const t5 = await api('POST', URL, { full_name: 'Al', mobile: newMobile() });
  const b5 = t5.body || {};
  check('T5', 'AC-5 · 2 letters (the lower limit)', '201, full_name "Al"',
    t5, t5.status === 201 && b5.full_name === 'Al');

  // T6 · + · AC-5 · 100 letters (the upper limit)
  const name100 = 'a'.repeat(100);
  const t6 = await api('POST', URL, { full_name: name100, mobile: newMobile() });
  const b6 = t6.body || {};
  check('T6', 'AC-5 · 100 letters (the upper limit)', '201, full_name is the 100 letters',
    t6, t6.status === 201 && b6.full_name === name100);

  // T7 · + · AC-5 · Ñ and . - ' are allowed
  const t7 = await api('POST', URL, { full_name: "Ñoño O'Brien-Cruz Jr.", mobile: newMobile() });
  const b7 = t7.body || {};
  check('T7', "AC-5 · Ñ and . - ' are allowed", `201, full_name "Ñoño O'Brien-Cruz Jr."`,
    t7, t7.status === 201 && b7.full_name === "Ñoño O'Brien-Cruz Jr.");

  // T8 · + · AC-6 · email left blank
  const t8 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: '' });
  const b8 = t8.body || {};
  check('T8', 'AC-6 · email left blank', '201, email null',
    t8, t8.status === 201 && b8.email === null);

  // T9 · + · AC-6 · a normal email
  const t9 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: 'rosa@example.com' });
  const b9 = t9.body || {};
  check('T9', 'AC-6 · a normal email', '201, email "rosa@example.com"',
    t9, t9.status === 201 && b9.email === 'rosa@example.com');

  // T10 · + · AC-6 · 254 characters (the limit)
  const email254 = 'a'.repeat(242) + '@example.com';
  const t10 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: email254 });
  const b10 = t10.body || {};
  check('T10', 'AC-6 · 254 characters (the limit)', '201, email is the 254 characters',
    t10, t10.status === 201 && email254.length === 254 && b10.email === email254);

  // T11 · + · AC-8 · +639 + 9 digits
  const m11 = newMobile();
  const plus11 = '+63' + m11.slice(1);
  const t11 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: plus11 });
  const b11 = t11.body || {};
  check('T11', 'AC-8 · +639 + 9 digits', '201, mobile saved as 09 + the same 9 digits',
    t11, t11.status === 201 && b11.mobile === m11);

  finish('card-01-positive');
})();
