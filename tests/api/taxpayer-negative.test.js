// Card 01 · TRN-01 · Register a taxpayer · API · negative tests (−, wrong input or a duplicate)
// From charters/card-01-charter.json, nodes with status "API test": T12 to T30.
const { api, check, finish, newMobile } = require('../../helpers/api-client');

const URL = '/api/v1/training/taxpayers';
const NAME_MSG = "2-100 characters: letters, spaces, . - ' and Ñ only";
const MOBILE_MSG = 'must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX';
const EMAIL_MSG = 'invalid email format';
const DUP_MSG = 'already registered for this tenant';

// One refused input: 422 and the exact message for that field.
async function refused(id, test, body, field, msg) {
  const res = await api('POST', URL, body);
  check(id, test, `422 {"detail":{"${field}":"${msg}"}}`, res, res.status === 422 && res.body?.detail?.[field] === msg);
}

(async () => {
  const name = 'Ana Dela Cruz';

  // AC-5 · Name
  await refused('T12', 'AC-5 · 1 letter', { full_name: 'A', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('T13', 'AC-5 · 1 letter with spaces around it', { full_name: '  A  ', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('T14', 'AC-5 · 101 letters (one too many)', { full_name: 'A'.repeat(101), mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('T15', 'AC-5 · a digit in the name', { full_name: 'Ana 2', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('T16', 'AC-5 · a symbol in the name', { full_name: 'Ana@Cruz', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('T17', 'AC-5 · blank name', { full_name: '', mobile: newMobile() }, 'full_name', NAME_MSG);

  // AC-8 · Mobile
  await refused('T18', 'AC-8 · 10 digits (one too few)', { full_name: name, mobile: '0917123456' }, 'mobile', MOBILE_MSG);
  await refused('T19', 'AC-8 · 12 digits (one too many)', { full_name: name, mobile: '091712345678' }, 'mobile', MOBILE_MSG);
  await refused('T20', 'AC-8 · spaces', { full_name: name, mobile: '0917 123 4567' }, 'mobile', MOBILE_MSG);
  await refused('T21', 'AC-8 · dashes', { full_name: name, mobile: '0917-123-4567' }, 'mobile', MOBILE_MSG);
  await refused('T22', 'AC-8 · starts with 08', { full_name: name, mobile: '08171234567' }, 'mobile', MOBILE_MSG);
  await refused('T23', 'AC-8 · starts with +638', { full_name: name, mobile: '+638171234567' }, 'mobile', MOBILE_MSG);

  // AC-6 · Email
  await refused('T24', 'AC-6 · no @', { full_name: name, mobile: newMobile(), email: 'rosa.example.com' }, 'email', EMAIL_MSG);
  await refused('T25', 'AC-6 · two @', { full_name: name, mobile: newMobile(), email: 'rosa@@example.com' }, 'email', EMAIL_MSG);
  await refused('T26', 'AC-6 · no dot after @', { full_name: name, mobile: newMobile(), email: 'rosa@examplecom' }, 'email', EMAIL_MSG);
  await refused('T27', 'AC-6 · 255 characters (one too many)',
    { full_name: name, mobile: newMobile(), email: `${'a'.repeat(243)}@example.com` }, 'email', EMAIL_MSG);

  // AC-4 · Duplicate mobile (setup: register a mobile once first)
  const mobile = newMobile();
  const setup = await api('POST', URL, { full_name: name, mobile });
  if (setup.status !== 201) {
    check('SETUP', 'Register the first taxpayer for T28 and T29', '201', setup, false);
  } else {
    // T28 · − · AC-4 · the same mobile again
    const t28 = await api('POST', URL, { full_name: 'Ben Dela Cruz', mobile });
    check('T28', 'AC-4 · the same mobile again', `409 {"detail":{"mobile":"${DUP_MSG}"}}`,
      t28, t28.status === 409 && t28.body?.detail?.mobile === DUP_MSG);

    // T29 · − · AC-4 · the same mobile again, in +639 form
    const t29 = await api('POST', URL, { full_name: 'Ben Dela Cruz', mobile: `+639${mobile.slice(2)}` });
    check('T29', 'AC-4 · the same mobile again, in +639 form', `409 {"detail":{"mobile":"${DUP_MSG}"}}`,
      t29, t29.status === 409 && t29.body?.detail?.mobile === DUP_MSG);
  }

  // T30 · − · nothing is saved when a rule is broken
  const fresh = newMobile();
  const first = await api('POST', URL, { full_name: 'A', mobile: fresh });
  const second = await api('POST', URL, { full_name: name, mobile: fresh });
  check('T30', 'nothing is saved when a rule is broken', 'first 422, then 201 (the refused one was not saved)',
    { first: first.status, second: second.status }, first.status === 422 && second.status === 201);

  finish('taxpayer-negative');
})();
