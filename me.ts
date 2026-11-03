// Who you are on UCTP. Change these two lines, nothing else.
// ME   = the name-tag in the top bar of the site ("You are: Ana-4821" -> 'Ana-4821').
// CARD = your Story Card number, two digits ('01' to '20').
export const ME = 'Ana-4821';
export const CARD = '01';

// Unique data for every run, so you never clash with yourself or a classmate.
// Your card number is inside each value, so two cards never make the same one.
let counter = 0;
function digits(n: number): string {
  counter += 1;
  return (String(Date.now()) + String(counter % 10)).slice(-n);
}
export const newMobile = () => `09${CARD}${digits(7)}`;            // 09 + 9 digits
export const newPin = () => {                                       // NNN-NN-NNN-NNN-NNN
  const d = digits(9);
  return `7${CARD}-26-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 9)}`;
};
export const newReference = () => `A${CARD}-${digits(9)}`;
