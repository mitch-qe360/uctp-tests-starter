// Card 01 · TRN-01 · Register a taxpayer · API · negative tests (−, wrong input or a duplicate)
// From charters/card-01-charter.json, nodes with status "API test": A12 to A30.
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
  await refused('A12', 'AC-5 · refuse the full name "A" (1 letter)', { full_name: 'A', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('A13', 'AC-5 · refuse the full name "  A  " (1 letter with spaces around)', { full_name: '  A  ', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('A14', 'AC-5 · refuse a full name of 101 letters (one too many)', { full_name: 'A'.repeat(101), mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('A15', 'AC-5 · refuse the full name "Ana 2" (a digit)', { full_name: 'Ana 2', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('A16', 'AC-5 · refuse the full name "Ana@Cruz" (a symbol)', { full_name: 'Ana@Cruz', mobile: newMobile() }, 'full_name', NAME_MSG);
  await refused('A17', 'AC-5 · refuse a blank full name ""', { full_name: '', mobile: newMobile() }, 'full_name', NAME_MSG);

  // AC-8 · Mobile
  await refused('A18', 'AC-8 · refuse the mobile 0917123456 (10 digits)', { full_name: name, mobile: '0917123456' }, 'mobile', MOBILE_MSG);
  await refused('A19', 'AC-8 · refuse the mobile 091712345678 (12 digits)', { full_name: name, mobile: '091712345678' }, 'mobile', MOBILE_MSG);
  await refused('A20', 'AC-8 · refuse the mobile "0917 123 4567" (spaces)', { full_name: name, mobile: '0917 123 4567' }, 'mobile', MOBILE_MSG);
  await refused('A21', 'AC-8 · refuse the mobile 0917-123-4567 (dashes)', { full_name: name, mobile: '0917-123-4567' }, 'mobile', MOBILE_MSG);
  await refused('A22', 'AC-8 · refuse the mobile 08171234567 (starts with 08)', { full_name: name, mobile: '08171234567' }, 'mobile', MOBILE_MSG);
  await refused('A23', 'AC-8 · refuse the mobile +638171234567 (starts with +638)', { full_name: name, mobile: '+638171234567' }, 'mobile', MOBILE_MSG);

  // AC-6 · Email
  await refused('A24', 'AC-6 · refuse the email "rosa.example.com" (no @)', { full_name: name, mobile: newMobile(), email: 'rosa.example.com' }, 'email', EMAIL_MSG);
  await refused('A25', 'AC-6 · refuse the email "rosa@@example.com" (two @)', { full_name: name, mobile: newMobile(), email: 'rosa@@example.com' }, 'email', EMAIL_MSG);
  await refused('A26', 'AC-6 · refuse the email "rosa@examplecom" (no dot after @)', { full_name: name, mobile: newMobile(), email: 'rosa@examplecom' }, 'email', EMAIL_MSG);
  await refused('A27', 'AC-6 · refuse an email of 255 characters (one too many)',
    { full_name: name, mobile: newMobile(), email: `${'a'.repeat(243)}@example.com` }, 'email', EMAIL_MSG);

  // AC-4 · Duplicate mobile (setup: register a mobile once first)
  const mobile = newMobile();
  const setup = await api('POST', URL, { full_name: name, mobile });
  if (setup.status !== 201) {
    check('SETUP', 'Register the first taxpayer for A28 and A29', '201', setup, false);
  } else {
    // A28 · AC-4 · refuse a mobile I already registered (409)
    const t28 = await api('POST', URL, { full_name: 'Ben Dela Cruz', mobile });
    check('A28', 'AC-4 · refuse a mobile I already registered (409)', `409 {"detail":{"mobile":"${DUP_MSG}"}}`,
      t28, t28.status === 409 && t28.body?.detail?.mobile === DUP_MSG);

    // A29 · AC-4 · refuse a mobile I already registered, sent in +639 form (409)
    const t29 = await api('POST', URL, { full_name: 'Ben Dela Cruz', mobile: `+639${mobile.slice(2)}` });
    check('A29', 'AC-4 · refuse a mobile I already registered, sent in +639 form (409)', `409 {"detail":{"mobile":"${DUP_MSG}"}}`,
      t29, t29.status === 409 && t29.body?.detail?.mobile === DUP_MSG);
  }

  // A30 · AC-5 · save nothing when the full name "A" is refused (the same mobile then works)
  const fresh = newMobile();
  const first = await api('POST', URL, { full_name: 'A', mobile: fresh });
  const second = await api('POST', URL, { full_name: name, mobile: fresh });
  check('A30', 'AC-5 · save nothing when the full name "A" is refused (the same mobile then works)', 'first 422, then 201 (the refused one was not saved)',
    { first: first.status, second: second.status }, first.status === 422 && second.status === 201);

  finish('taxpayer-negative');
})();
