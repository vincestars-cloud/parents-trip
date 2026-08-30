/* trip.js. Turns the questionnaire answers into the plan and the costs.
   One source of truth: what they answered decides what they see. */
const ANSWERS_KEY = 'ptrip.answers.v2';
const COSTS_KEY = 'ptrip.costs.v3';
const STAMP_KEY = 'ptrip.stamp.v1';
const QUESTION_IDS = ['who','seat','sleep_plane','stopover','layover_home','hotel_matters','beds','money_style','food_adventure','spice','street_food','avoid_food','walk','stairs','heat','mobility','must_see','elephants','birthday','pace','dental_type','checkup','health_notes','phone','phone_model','carrier','passport','worries','wish'];

function getAnswers() { try { return JSON.parse(localStorage.getItem(ANSWERS_KEY) || '{}') || {}; } catch (e) { return {}; } }
function answeredCount(a) { return QUESTION_IDS.filter(id => { const v = a[id]; return !(v == null || v === '' || (Array.isArray(v) && !v.length)); }).length; }
function stamp(a) { return QUESTION_IDS.map(id => JSON.stringify(a[id] ?? null)).join('|'); }
function has(a, key, val) { const v = a[key]; return Array.isArray(v) ? v.includes(val) : v === val; }

/* What the answers decide. Every field carries the answer that drove it, so the pages can say why. */
function decide(a) {
  const frugal = a.money_style === 'save', comfort = a.money_style === 'comfort';
  const must = a.must_see || [], hotel = a.hotel_matters || [], mob = a.mobility || [];
  const slow = a.pace === 'slow', hot = a.heat === 'struggle';
  const shortWalk = a.walk === '5', noStairs = a.stairs === 'avoid' || shortWalk;
  const answered = answeredCount(a) > 0;
  return {
    answered, who: a.who || '', frugal, comfort, slow, hot, shortWalk, noStairs,
    skipAUH: a.stopover === 'no',
    lowEnergyAUH: hot || shortWalk || slow,
    elephants: a.elephants === 'yes' || (!a.elephants && must.includes('elephants')),
    mountain: a.elephants !== 'yes',
    birthday: a.birthday || 'rooftop',
    acFood: a.street_food === 'ac' || a.food_adventure === 'familiar',
    streetFood: a.street_food === 'yes',
    noSpice: a.spice === 'none',
    wheelchair: mob.includes('wheelchair'),
    cane: mob.includes('cane') || mob.includes('knees'),
    implant: a.dental_type === 'implant',
    dental: a.dental_type || '',
    checkup: a.checkup || 'both',
    wantsMassage: must.includes('massage'),
    wantsMuseum: must.includes('museum') || !must.length,
    wantsMarkets: must.includes('markets'),
    wantsRiver: must.includes('river'),
    wantsTemples: must.includes('temples') || !must.length,
    nearHospital: hotel.includes('hospital'),
    wantsPool: hotel.includes('pool') || hotel.includes('bath'),
    wantsQuiet: hotel.includes('quiet'),
    tmobile: a.carrier === 'tmobile',
    phoneUnsure: a.phone === 'unsure',
    layover: a.layover_home || 'hotel',
    seat: a.seat || '', beds: a.beds || '', avoidFood: a.avoid_food || '',
    passportCheck: a.passport === 'no' || a.passport === 'check'
  };
}

/* Which cost options are ticked, given the answers. */
function costChoices(d) {
  const c = {};
  c.flights = 'etihad';
  c.bags = 'value';
  c.stopover = d.skipAUH ? 'skip' : 'free';
  c.domestic = d.frugal ? 'vietjet' : 'mix';
  c.bkk = d.frugal && !d.nearHospital ? 'adlib3' : (d.comfort && d.wantsPool ? 'doubletree' : 'adlib');
  c.cnx = d.comfort && d.wantsQuiet ? 'melia' : 'vijit';
  c.food = d.acFood ? 'ac' : (d.frugal || d.streetFood ? 'street' : 'mixfood');
  c.transport = d.noStairs || d.hot ? 'taxi' : 'mixtx';
  c.phone = d.tmobile ? 'roam' : (d.phoneUnsure ? 'airportsim' : (d.frugal ? 'esim1' : 'esim2'));
  c.insurance = 'ins';
  c.layover = d.layover === 'terminal' ? 'wait' : (d.layover === 'lounge' ? 'lounge' : 'airhotel');

  const bkk = [];
  if (d.wantsTemples) bkk.push('palace');
  if (d.wantsMassage) bkk.push('watpho_massage');
  bkk.push(d.birthday === 'cruise' ? 'cruise' : d.birthday === 'chinatown' ? 'chinatown' : d.birthday === 'quiet' ? 'quietdinner' : 'supanniga');
  if (!d.frugal) bkk.push('costume');
  if (d.hot || !d.slow) bkk.push('museumsiam');
  if (d.wantsMarkets) bkk.push('chatuchak_alt');
  c.bkkdo = bkk;

  const cnx = [];
  if (d.elephants) cnx.push('elephants');
  if (d.mountain || must0(d)) cnx.push('suthep');
  if (d.wantsMassage) cnx.push('cnxmassage');
  c.cnxdo = cnx;

  const auh = ['auhtaxi'];
  if (d.wantsMuseum) auh.push('louvre');
  if (!d.lowEnergyAUH) auh.push('qasr');
  c.auh = auh;

  c.misc = ['tips', 'buffer'];

  const med = [];
  if (d.checkup === 'both') med.push(d.frugal ? 'chk_bkh' : 'chk_70');
  else if (d.checkup === 'me') med.push('chk_one');
  if (d.dental === 'root') med.push('dental_rct');
  else if (d.dental === 'implant') med.push('dental_implant');
  else if (d.dental === 'extraction') med.push('dental_ext');
  else med.push('dental_crown');
  c.medical = med;
  return c;
}
function must0(d) { return false; }

/* The banner both pages show at the top. */
function personalBanner(a) {
  const n = answeredCount(a), d = decide(a);
  if (!n) return '<a class="pers none" href="questions.html"><b>This is the standard plan.</b> Answer the questions and this page changes to match you.</a>';
  const changed = localStorage.getItem(STAMP_KEY) && localStorage.getItem(STAMP_KEY) !== stamp(a);
  const name = d.who === 'Both' ? 'your' : (d.who ? d.who + '’s' : 'your');
  return '<div class="pers"><span>Matched to ' + name + ' answers. ' + n + ' of 29 answered.' + (changed ? ' Your answers changed since last time.' : '') + '</span><a href="questions.html">Change answers</a></div>';
}
function markStamp(a) { try { localStorage.setItem(STAMP_KEY, stamp(a)); } catch (e) {} }
function why(text) { return '<span class="why">Because you said: ' + text + '</span>'; }

/* The priced catalogue. Shared by the questions page (live total) and the cost sheet (full editor). */
const CATALOG = [
  { id: 'flights', title: 'The big flights', mode: 'one', o: [
    { id: 'etihad', l: 'Etihad through Abu Dhabi', s: 'Cheapest. One free hotel night. Under a US travel warning.', p: 1921 },
    { id: 'united', l: 'United through San Francisco', s: 'Avoids the Middle East. Two stops, 27 hours. Bags included.', p: 2198 } ] },
  { id: 'bags', title: 'Suitcases on Etihad', mode: 'one', o: [
    { id: 'value', l: 'Value fare, two suitcases each', s: 'About $280 more than the basic fare.', p: 280 },
    { id: 'carryon', l: 'Basic fare, carry-on only', s: 'Nine days with a small bag each. Not realistic.', p: 0 } ] },
  { id: 'stopover', title: 'The night in Abu Dhabi', mode: 'one', o: [
    { id: 'free', l: 'The free Etihad hotel', s: 'Ask for Aloft, a modern 4-star. Room only, $14 in fees.', p: 14 },
    { id: 'rayhaan', l: 'Pick our own: Khalidiya Palace', s: '5-star on the beach, rated 9.0.', p: 99 },
    { id: 'skip', l: 'Skip the city, fly straight through', s: 'Two hours in the airport.', p: 0 } ] },
  { id: 'domestic', title: 'Bangkok to Chiang Mai and back', mode: 'one', o: [
    { id: 'mix', l: 'Vietjet there, Thai Airways back', s: 'Bags included on the way back, when it matters.', p: 237 },
    { id: 'vietjet', l: 'Vietjet both ways', s: 'Pay for bags at booking.', p: 200 } ] },
  { id: 'bkk', title: 'Bangkok hotel', mode: 'one', o: [
    { id: 'adlib', l: 'Ad Lib Bangkok, 4 nights', s: 'Rated 9.1. One minute to the hospital. Pool.', p: 340 },
    { id: 'doubletree', l: 'DoubleTree by Hilton, 4 nights', s: 'Rated 8.8. Big rooms, big breakfast, same street as the dentist.', p: 420 },
    { id: 'adlib3', l: 'Ad Lib, 3 nights', s: 'Saves a night. You wait in the lobby on Sunday morning.', p: 255 } ] },
  { id: 'cnx', title: 'Chiang Mai hotel, 2 nights', mode: 'one', o: [
    { id: 'vijit', l: 'THEE Vijit Lanna', s: 'Elevator, two pools, at the Old City gate.', p: 139 },
    { id: 'melia', l: 'Meliá Chiang Mai', s: 'Rated 9.0. Rooftop pool, very quiet.', p: 224 } ] },
  { id: 'food', title: 'Food for six days', mode: 'one', o: [
    { id: 'mixfood', l: 'Stalls at lunch, restaurants at dinner', s: 'About $40 a day.', p: 240 },
    { id: 'ac', l: 'Restaurants with air conditioning', s: 'About $60 a day.', p: 360 },
    { id: 'street', l: 'Mostly markets and stalls', s: 'About $25 a day.', p: 150 } ] },
  { id: 'bkkdo', title: 'Bangkok', mode: 'many', o: [
    { id: 'palace', l: 'Grand Palace, Wat Pho, Wat Arun', s: 'Tickets and the ferry.', p: 50 },
    { id: 'watpho_massage', l: 'Foot massage at Wat Pho', s: '30 minutes each, in the shade.', p: 24 },
    { id: 'supanniga', l: 'Birthday: rooftop facing Wat Arun', s: 'The $62 table minimum is the dinner.', p: 62 },
    { id: 'cruise', l: 'Birthday: river dinner cruise', s: 'Buffet and music. Boarding is a taxi ride away.', p: 60 },
    { id: 'chinatown', l: 'Birthday: Chinatown street food', s: 'Loud, bright, hot.', p: 25 },
    { id: 'quietdinner', l: 'Birthday: a quiet restaurant near the hotel', s: 'White tablecloths, air conditioning.', p: 50 },
    { id: 'costume', l: 'Thai-dress portrait at Wat Arun', s: 'The birthday photo.', p: 12 },
    { id: 'museumsiam', l: 'Museum Siam, the hot hours', s: 'Air-conditioned, next to the palace.', p: 12 },
    { id: 'chatuchak_alt', l: 'A market afternoon', s: 'The covered market by the river, out of the sun.', p: 20 } ] },
  { id: 'cnxdo', title: 'Chiang Mai', mode: 'many', o: [
    { id: 'elephants', l: 'Elephant Nature Park, half day', s: 'Rescued elephants, flat path, no riding. $77 each.', p: 154 },
    { id: 'suthep', l: 'Doi Suthep with a driver', s: 'The mountain temple. Cable car up.', p: 30 },
    { id: 'cnxmassage', l: 'Thai massage, one hour each', s: '', p: 25 } ] },
  { id: 'auh', title: 'The Abu Dhabi day', mode: 'many', o: [
    { id: 'louvre', l: 'Louvre Abu Dhabi', s: 'Air-conditioned, world art.', p: 30 },
    { id: 'qasr', l: 'Qasr Al Watan palace', s: 'Gold and marble, air-conditioned.', p: 30 },
    { id: 'auhtaxi', l: 'Taxis and meals for the day', s: '', p: 115 } ] },
  { id: 'transport', title: 'Getting around Thailand', mode: 'one', o: [
    { id: 'mixtx', l: 'Skytrain, boats, taxi app when tired', s: 'Includes the airport rides.', p: 100 },
    { id: 'taxi', l: 'Taxi app for everything', s: 'Door to door, no stairs.', p: 160 } ] },
  { id: 'phone', title: 'Phone service', mode: 'one', o: [
    { id: 'esim1', l: 'One eSIM, shared', s: 'Dad’s phone shares its internet with Mom’s.', p: 25 },
    { id: 'esim2', l: 'One eSIM each', s: 'Both phones work on their own.', p: 50 },
    { id: 'airportsim', l: 'SIM cards at the Bangkok airport', s: 'A counter swaps the card in five minutes. Bring the passport.', p: 30 },
    { id: 'roam', l: 'Use our US plan abroad', s: 'Free on the bigger T-Mobile plans.', p: 0 } ] },
  { id: 'insurance', title: 'Travel insurance', mode: 'one', o: [
    { id: 'ins', l: 'Yes', s: 'Medical and a flight home if needed. Medicare covers nothing abroad.', p: 200 },
    { id: 'noins', l: 'No', s: 'Not recommended at 70.', p: 0 } ] },
  { id: 'layover', title: 'The night at Abu Dhabi airport, going home', mode: 'one', o: [
    { id: 'airhotel', l: 'A room inside the terminal', s: 'A real bed for six hours.', p: 125 },
    { id: 'lounge', l: 'A lounge with recliners', s: 'Showers and food. $50 each.', p: 100 },
    { id: 'wait', l: 'Rest in the terminal', s: 'Free. Chairs at 2 AM.', p: 0 } ] },
  { id: 'misc', title: 'Odds and ends', mode: 'many', o: [
    { id: 'tips', l: 'Tips, snacks, small gifts', s: '', p: 60 },
    { id: 'buffer', l: 'A 10% cushion for surprises', s: 'Money you probably bring home.', p: 0, dyn: 'buffer' } ] },
  { id: 'medical', title: 'Medical, outside the $3,500', mode: 'many', outside: true, o: [
    { id: 'chk_bkh', l: 'Check-ups for both at Bangkok Hospital', s: 'Built for your age, a third less. A 20-minute taxi.', p: 2046 },
    { id: 'chk_70', l: 'Check-ups for both at Bumrungrad', s: 'Same tests, walking distance, more expensive.', p: 2834 },
    { id: 'chk_basic', l: 'Basic check-ups for both', s: 'Skips PSA, mammogram, bone density.', p: 1137 },
    { id: 'chk_one', l: 'Check-up for one of you', s: 'At Bangkok Hospital.', p: 1023 },
    { id: 'dental_crown', l: 'Dad’s crown', s: 'Two visits. 2-year warranty.', p: 677 },
    { id: 'dental_rct', l: 'Dad’s root canal', s: 'The dentist confirms you can fly two days later.', p: 523 },
    { id: 'dental_ext', l: 'Dad’s extraction', s: 'One visit, Monday morning.', p: 65 },
    { id: 'dental_implant', l: 'Dad’s implant, first half', s: 'The post now. The tooth needs a second trip.', p: 2000 } ] }
];
const EXCLUSIVE = [['supanniga','cruise','chinatown','quietdinner'], ['chk_bkh','chk_70','chk_basic','chk_one'], ['dental_crown','dental_rct','dental_ext','dental_implant']];
const BUDGET = 3500;

function groupOff(id, sel) { const eti = sel.flights === 'etihad'; return (['bags','stopover','layover'].includes(id) && !eti) || (id === 'auh' && (!eti || sel.stopover === 'skip')); }
function groupTotal(g, sel, base) {
  if (groupOff(g.id, sel)) return 0;
  if (g.mode === 'one') { const o = g.o.find(o => o.id === sel[g.id]); return o ? o.p : 0; }
  return g.o.filter(o => (sel[g.id] || []).includes(o.id)).reduce((s, o) => s + (o.dyn === 'buffer' ? base * 0.10 : o.p), 0);
}
function totals(sel) {
  let base = 0; CATALOG.filter(g => !g.outside && g.id !== 'misc').forEach(g => { base += groupTotal(g, sel, 0); });
  const misc = CATALOG.find(g => g.id === 'misc');
  return { inside: base + groupTotal(misc, sel, base), outside: groupTotal(CATALOG.find(g => g.id === 'medical'), sel, base), base };
}
const fmtMoney = n => '$' + Math.round(n).toLocaleString('en-US');
