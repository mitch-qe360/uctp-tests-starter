const { api, check, finish, newMobile, newPin, newReference, AS_PROBE, NO_USER, AS_OTHER_CASE, ME } = require('../../helpers/api-client');

(async () => {
  const URL = '/api/v1/training/taxpayers';
  const NAME_MSG = "2-100 characters: letters, spaces, . - ' and Ñ only";
  const MOBILE_MSG = 'must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX';
  const EMAIL_MSG = 'invalid email format';
  const DUP_MSG = 'already registered for this tenant';

  // Setup: a taxpayer whose mobile is already registered (for T28 and T29)
  const regMobile = newMobile();
  const setup = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: regMobile });
  if (setup.status !== 201) {
    check('SETUP', 'register a taxpayer to duplicate', '201', setup, false);
    return finish('card-01-negative');
  }

  // 422 with one field message
  async function refused(id, test, payload, field, message) {
    const r = await api('POST', URL, payload);
    const d = (r.body && r.body.detail) || {};
    check(id, test, `422 {"detail":{"${field}":"${message}"}}`,
      r, r.status === 422 && d[field] === message);
  }

  // T12 · − · AC-5 · 1 letter
  await refused('T12', 'AC-5 · 1 letter', { full_name: 'A', mobile: newMobile() }, 'full_name', NAME_MSG);
  // T13 · − · AC-5 · 1 letter with spaces around it
  await refused('T13', 'AC-5 · 1 letter with spaces around it', { full_name: '  A  ', mobile: newMobile() }, 'full_name', NAME_MSG);
  // T14 · − · AC-5 · 101 letters (one too many)
  await refused('T14', 'AC-5 · 101 letters (one too many)', { full_name: 'a'.repeat(101), mobile: newMobile() }, 'full_name', NAME_MSG);
  // T15 · − · AC-5 · a digit in the name
  await refused('T15', 'AC-5 · a digit in the name', { full_name: 'Ana 2', mobile: newMobile() }, 'full_name', NAME_MSG);
  // T16 · − · AC-5 · a symbol in the name
  await refused('T16', 'AC-5 · a symbol in the name', { full_name: 'Ana@Cruz', mobile: newMobile() }, 'full_name', NAME_MSG);
  // T17 · − · AC-5 · blank name
  await refused('T17', 'AC-5 · blank name', { full_name: '', mobile: newMobile() }, 'full_name', NAME_MSG);

  // T18 · − · AC-8 · 10 digits (one too few)
  await refused('T18', 'AC-8 · 10 digits (one too few)', { full_name: 'Ana Dela Cruz', mobile: '0917123456' }, 'mobile', MOBILE_MSG);
  // T19 · − · AC-8 · 12 digits (one too many)
  await refused('T19', 'AC-8 · 12 digits (one too many)', { full_name: 'Ana Dela Cruz', mobile: '091712345678' }, 'mobile', MOBILE_MSG);
  // T20 · − · AC-8 · spaces
  await refused('T20', 'AC-8 · spaces', { full_name: 'Ana Dela Cruz', mobile: '0917 123 4567' }, 'mobile', MOBILE_MSG);
  // T21 · − · AC-8 · dashes
  await refused('T21', 'AC-8 · dashes', { full_name: 'Ana Dela Cruz', mobile: '0917-123-4567' }, 'mobile', MOBILE_MSG);
  // T22 · − · AC-8 · starts with 08
  await refused('T22', 'AC-8 · starts with 08', { full_name: 'Ana Dela Cruz', mobile: '08171234567' }, 'mobile', MOBILE_MSG);
  // T23 · − · AC-8 · starts with +638
  await refused('T23', 'AC-8 · starts with +638', { full_name: 'Ana Dela Cruz', mobile: '+638171234567' }, 'mobile', MOBILE_MSG);

  // T24 · − · AC-6 · no @
  await refused('T24', 'AC-6 · no @', { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: 'rosa.example.com' }, 'email', EMAIL_MSG);
  // T25 · − · AC-6 · two @
  await refused('T25', 'AC-6 · two @', { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: 'rosa@@example.com' }, 'email', EMAIL_MSG);
  // T26 · − · AC-6 · no dot after @
  await refused('T26', 'AC-6 · no dot after @', { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: 'rosa@examplecom' }, 'email', EMAIL_MSG);
  // T27 · − · AC-6 · 255 characters (one too many)
  await refused('T27', 'AC-6 · 255 characters (one too many)', { full_name: 'Ana Dela Cruz', mobile: newMobile(), email: 'a'.repeat(243) + '@example.com' }, 'email', EMAIL_MSG);

  // T28 · − · AC-4 · the same mobile again
  const t28 = await api('POST', URL, { full_name: 'Ben Dela Cruz', mobile: regMobile });
  const d28 = (t28.body && t28.body.detail) || {};
  check('T28', 'AC-4 · the same mobile again', `409 {"detail":{"mobile":"${DUP_MSG}"}}`,
    t28, t28.status === 409 && d28.mobile === DUP_MSG);

  // T29 · − · AC-4 · the same mobile again, in +639 form
  const t29 = await api('POST', URL, { full_name: 'Ben Dela Cruz', mobile: '+63' + regMobile.slice(1) });
  const d29 = (t29.body && t29.body.detail) || {};
  check('T29', 'AC-4 · the same mobile again, in +639 form', `409 {"detail":{"mobile":"${DUP_MSG}"}}`,
    t29, t29.status === 409 && d29.mobile === DUP_MSG);

  // T30 · − · nothing is saved when a rule is broken
  const m30 = newMobile();
  const first30 = await api('POST', URL, { full_name: 'A', mobile: m30 });
  const second30 = await api('POST', URL, { full_name: 'Ana Dela Cruz', mobile: m30 });
  check('T30', 'nothing is saved when a rule is broken', 'first 422, then 201 (the refused one was not saved)',
    { first: first30, second: second30 }, first30.status === 422 && second30.status === 201);

  finish('card-01-negative');
})();
