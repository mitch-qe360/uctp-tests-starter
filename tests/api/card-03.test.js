// Card 03 · Property tax bill (INDUSTRIAL, this year) and its two lines
// Runs in the browser Console (F12 › Console) and with Node: node tests/api/card-03.test.js
// Change ME first: your name-tag from the top bar of the site.
(async () => {
  const ME = 'Ana-4821';   // your name-tag from the top bar
  const CARD = '03';
  const BASE = (typeof process !== 'undefined' && process.env.BASE_URL) || 'https://city-treasurer-staging.aiqe.pro';
  const HEADERS = { 'Content-Type': 'application/json', 'X-Tenant-ID': 'TAGAYTAY', 'X-User-ID': ME };
  const results = [];
  async function api(method, path, body, headers = HEADERS) {
    try {
      const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      let data = null;
      try { data = await res.json(); } catch (e) { /* no JSON body */ }
      return { status: res.status, body: data };
    } catch (e) {
      return { status: 0, body: String(e) };            // network error
    }
  }
  function check(id, test, expected, actual, pass) {
    results.push({ id, test, expected: String(expected), actual: typeof actual === 'string' ? actual : JSON.stringify(actual), result: pass ? 'PASS' : 'FAIL' });
  }
  function finish() {
    console.table(results);
    const failed = results.filter(r => r.result === 'FAIL').length;
    console.log(`${results.length - failed} passed, ${failed} failed`);
    if (typeof process !== 'undefined') process.exitCode = failed ? 1 : 0;   // a FAIL makes CI red
  }
  const stamp = String(Date.now()).slice(-9);                 // new data on every run
  const mobile = `09${CARD}${stamp.slice(-7)}`;              // 09 + 9 digits
  const pin = `7${CARD}-26-${stamp.slice(0, 3)}-${stamp.slice(3, 6)}-${stamp.slice(6, 9)}`;
  const pin2 = `8${pin.slice(1)}`;                           // a second new PIN
  const pin3 = `9${pin.slice(1)}`;                           // a third new PIN
  const PROBE = { ...HEADERS, 'X-User-ID': ME + '-probe' };
  const line = (b, type) => ((b && b.receivables) || []).find(r => r.type === type) || {};

  try {
    // Setup: my taxpayer
    const s1 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ana Dela Cruz', mobile });
    if (s1.status !== 201) { check('Setup', 'Create taxpayer', 201, s1, false); return finish(); }
    const taxpayer_id = s1.body.taxpayer_id;
    const bill = (p, av, extra = {}) => ({ taxpayer_id, pin: p, property_class: 'INDUSTRIAL', assessed_value: av, tax_year: 2026, ...extra });

    // T1: create the bill
    const t1 = await api('POST', '/api/v1/training/rpt-bills', bill(pin, '1000000.00'));
    check('T1', 'INDUSTRIAL, AV 1000000.00, 2026', '201, RPT "20000.00", RPT_SEF "10000.00"',
      t1, t1.status === 201 && line(t1.body, 'RPT').base_amount === '20000.00' && line(t1.body, 'RPT_SEF').base_amount === '10000.00');
    if (t1.status !== 201) return finish();                   // no bill: stop
    const bill_id = t1.body.bill_id;

    // T2: read the bill back
    const t2 = await api('GET', `/api/v1/training/rpt-bills/${bill_id}`);
    const b2 = t2.body || {};
    check('T2', 'GET my bill by id', '200, INDUSTRIAL, "1000000.00", 2026, due "2026-12-31", RPT 20000.00 OPEN, RPT_SEF 10000.00 OPEN',
      t2, t2.status === 200 && b2.property_class === 'INDUSTRIAL' && b2.assessed_value === '1000000.00' && b2.tax_year === 2026
        && b2.due_date === '2026-12-31' && line(b2, 'RPT').base_amount === '20000.00' && line(b2, 'RPT').status === 'OPEN'
        && line(b2, 'RPT_SEF').base_amount === '10000.00' && line(b2, 'RPT_SEF').status === 'OPEN');

    // T3: the bill is in My bills
    const t3 = await api('GET', '/api/v1/training/rpt-bills');
    const row = (Array.isArray(t3.body) ? t3.body : []).find(r => r.bill_id === bill_id);
    check('T3', 'GET my property tax bills list', `200, row RPT ${pin} | INDUSTRIAL 2026 | 1000000.00 | OPEN`,
      { status: t3.status, row }, t3.status === 200 && !!row && row.kind === 'RPT' && row.ref === pin
        && row.detail === 'INDUSTRIAL 2026' && row.amount === '1000000.00' && row.status === 'OPEN');

    // T4: assessed value 0
    const t4 = await api('POST', '/api/v1/training/rpt-bills', bill(pin2, '0'));
    check('T4', 'AV "0"', '422 {"detail":{"assessed_value":"must be greater than 0"}}',
      t4, t4.status === 422 && (t4.body || {}).detail?.assessed_value === 'must be greater than 0');

    // T5: 3 decimals
    const t5 = await api('POST', '/api/v1/training/rpt-bills', bill(pin2, '1000.005'));
    check('T5', 'AV "1000.005"', '422 {"detail":{"assessed_value":"must be a positive amount with at most 2 decimals"}}',
      t5, t5.status === 422 && (t5.body || {}).detail?.assessed_value === 'must be a positive amount with at most 2 decimals');

    // T6: PIN with 4 groups
    const t6 = await api('POST', '/api/v1/training/rpt-bills', bill('603-26-482-100', '1000.00'));
    check('T6', 'PIN "603-26-482-100" (4 groups)', '422 {"detail":{"pin":"must match NNN-NN-NNN-NNN-NNN"}}',
      t6, t6.status === 422 && (t6.body || {}).detail?.pin === 'must match NNN-NN-NNN-NNN-NNN');

    // T7: the same PIN again
    const t7 = await api('POST', '/api/v1/training/rpt-bills', bill(pin, '1000000.00'));
    check('T7', 'Same PIN a second time', '409 {"detail":{"pin":"already taken for this tenant"}}',
      t7, t7.status === 409 && (t7.body || {}).detail?.pin === 'already taken for this tenant');

    // T8: another user cannot see the bill
    const t8 = await api('GET', `/api/v1/training/rpt-bills/${bill_id}`, undefined, PROBE);
    check('T8', 'GET my bill as "<me>-probe"', '404 {"detail":"Not Found"}',
      t8, t8.status === 404 && (t8.body || {}).detail === 'Not Found');

    // T9: one centavo over the limit
    const t9 = await api('POST', '/api/v1/training/rpt-bills', bill(pin2, '1000000000.00'));
    check('T9', 'AV "1000000000.00"', '422 {"detail":{"assessed_value":"must not exceed 999999999.99"}}',
      t9, t9.status === 422 && (t9.body || {}).detail?.assessed_value === 'must not exceed 999999999.99');

    // T10: the largest value allowed
    const t10 = await api('POST', '/api/v1/training/rpt-bills', bill(pin3, '999999999.99'));
    check('T10', 'AV "999999999.99" (the limit)', '201, RPT "20000000.00", RPT_SEF "10000000.00"',
      t10, t10.status === 201 && line(t10.body, 'RPT').base_amount === '20000000.00' && line(t10.body, 'RPT_SEF').base_amount === '10000000.00');
  } catch (e) {
    check('ERR', 'Script error', 'no error', String(e), false);
  }
  finish();
})();