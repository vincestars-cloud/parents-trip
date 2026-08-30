/* trip.js. Turns the questionnaire answers into the plan and the costs.
   One source of truth: what they answered decides what they see. */
const ANSWERS_KEY = 'ptrip.answers.v2';
const COSTS_KEY = 'ptrip.costs.v3';
const STAMP_KEY = 'ptrip.stamp.v1';
const QUESTION_IDS = ['who','seat','sleep_plane','stopover','layover_home','hotel_matters','beds','money_style','food_adventure','spice','street_food','avoid_food','walk','stairs','heat','mobility','must_see','elephants','budget_rule','birthday','pace','dental_type','checkup','health_notes','phone','phone_model','carrier','passport','worries','wish'];

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
    wantsCamels: must.includes('camels'),
    wantsShopping: must.includes('shopping') || must.includes('markets'),
    wantsCooking: must.includes('cooking'),
    wantsWater: must.includes('river') || must.includes('floating'),
    wantsMountain: must.includes('mountain'),
    wantsRuins: must.includes('ruins'),
    fitBudgetFirst: a.budget_rule === 'fit',
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
  c.domestic = d.frugal ? 'vietjet' : 'mix';
  c.stopover = d.skipAUH ? 'skip' : 'free';
  c.layover = d.layover === 'terminal' ? 'wait' : (d.layover === 'lounge' ? 'lounge' : 'airhotel');
  c.bkk = d.comfort && d.nearHospital ? 'adlib' : (d.comfort ? 'amber' : (d.noStairs ? 'hopinn' : (d.frugal ? 'ratchada' : 'citypark')));
  c.cnx = d.comfort ? 'estia' : (d.frugal ? 'rompo' : 'sleepmai');
  c.food = d.acFood ? 'ac' : (d.frugal || d.streetFood ? 'street' : 'mixfood');
  c.transport = d.noStairs || d.hot ? 'bolt' : (d.frugal ? 'mixtx' : 'bolt');
  c.phone = d.tmobile ? 'roam' : (d.phoneUnsure ? 'airportsim' : (d.frugal ? 'esim1' : 'esim2'));
  c.insurance = 'ins';
  c.misc = ['tips', 'buffer'];

  // Abu Dhabi: the camel is the memory, so it wins unless they are frugal or fading in the heat
  c.auhday = d.wantsCamels ? (d.comfort ? 'auh_big' : 'auh_camel') : (d.frugal || d.lowEnergyAUH ? 'auh_frugal' : 'auh_camel');
  const oud = ['souk_visit'];
  if (d.wantsShopping) oud.push(d.frugal ? 'oud_gift' : 'oud_bottle');
  c.oud = oud;

  // Bangkok, one of each kind
  c.bkk_sight = d.frugal ? 'watpho' : (d.wantsTemples ? 'palace' : 'watpho');
  c.bkk_water = d.wantsWater ? (d.frugal ? 'boat' : 'floating') : 'boat';
  const mk = ['talatnoi'];
  if (d.wantsMarkets) { mk.push('chatuchak'); if (!d.frugal) mk.push('gifts'); }
  c.bkk_market = mk;
  c.bkk_daytrip = (d.slow || d.shortWalk) && !d.wantsRuins ? 'noday' : 'ayutthaya';
  const hands = [];
  if (d.wantsMassage) hands.push(d.frugal ? 'massage_cheap' : 'massage_watpho');
  c.bkk_hands = hands;
  c.bkk_night = d.birthday === 'rooftop' ? 'supanniga' : (d.birthday === 'chinatown' ? 'chinatown' : (d.birthday === 'cruise' ? 'boat_dinner' : (d.frugal ? 'chinatown' : 'mahanakhon')));

  // Chiang Mai
  c.cnx_animals = d.elephants ? 'elephants' : 'noeleph';
  const cnx = ['monkchat', 'silver'];
  if (d.mountain || d.wantsMountain) cnx.push('suthep');
  if (d.wantsCooking) cnx.push('cooking_cnx');
  if (d.wantsMassage) cnx.push('cnx_massage');
  if (!d.slow) cnx.push('alms');
  c.cnx_do = cnx;

  const med = [];
  if (d.checkup === 'both') med.push(d.frugal ? 'chk_bkh' : 'chk_70');
  else if (d.checkup === 'me') med.push('chk_one');
  if (d.dental === 'root') med.push('dental_rct');
  else if (d.dental === 'implant') med.push('dental_implant');
  else if (d.dental === 'extraction') med.push('dental_ext');
  else if (d.dental) med.push('dental_crown');
  else med.push('dental_crown');
  c.medical = med;
  return c;
}

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

/* The priced catalogue. Every price live-checked 29-30 Aug 2026; sources in the research files.
   Experiences are grouped by KIND, so the trip has one of each rather than five of the same. */
const CATALOG = [
  { id: 'flights', title: 'The big flights', mode: 'one', o: [
    { id: 'etihad', l: 'Etihad through Abu Dhabi', s: 'Cheapest, and the only one with a free hotel night. Abu Dhabi is under a US travel warning.', p: 1921 },
    { id: 'united', l: 'United through San Francisco', s: 'Avoids the Middle East. Two stops, 27 hours, bags included.', p: 2198 } ] },
  { id: 'bags', title: 'Suitcases on Etihad', mode: 'one', o: [
    { id: 'value', l: 'Value fare, two suitcases each', s: 'The basic fare allows a carry-on only. Paying per bag costs more than this.', p: 280 },
    { id: 'carryon', l: 'Basic fare, carry-on only', s: 'Nine days out of a small bag each.', p: 0 } ] },
  { id: 'domestic', title: 'Bangkok to Chiang Mai and back', mode: 'one', o: [
    { id: 'vietjet', l: 'Vietjet both ways', s: 'Budget airline. Bag fees included in this price.', p: 200 },
    { id: 'mix', l: 'Vietjet there, Thai Airways back', s: 'The full-service airline on the day you connect to the long flight home.', p: 237 } ] },

  { id: 'bkk', title: 'Where you sleep in Bangkok, 4 nights', mode: 'one', o: [
    { id: 'ratchada', l: 'Ratchada Boutique', s: 'Rated 4.5 from 404. Breakfast. 13 min to an MRT with a lift. Cheapest that clears the bar. Ask them to confirm the lift before paying.', p: 106 },
    { id: 'hopinn', l: 'HOP INN On Nut', s: 'Rated 4.7 from 1,040. The only one with a stated accessible lift, next to a Skytrain station that has one too. Plain rooms.', p: 120 },
    { id: 'citypark', l: 'City Park Pratunam', s: 'Rated 4.8 from 1,505. Lift confirmed, 3 km from the hospital, in the garment district. Noisy street.', p: 139 },
    { id: 'amber', l: 'Hotel Amber Sukhumvit 85', s: 'Rated 4.6 from 4,037. Lift, buffet breakfast, outdoor pool.', p: 152 },
    { id: 'adlib', l: 'Ad Lib Bangkok', s: 'Rated 9.1. One minute from the hospital door, free tuk-tuk to the train, pool. Four times the price of the cheapest.', p: 394 } ] },
  { id: 'cnx', title: 'Where you sleep in Chiang Mai, 2 nights', mode: 'one', o: [
    { id: 'rompo', l: 'Rom Po Boutique', s: 'Rated 4.8 from 508. 270 m from the old city gate. $15 a night. Confirm the lift.', p: 31 },
    { id: 'phrasingh', l: 'Be Phrasingh', s: 'Rated 4.5. Rooftop jacuzzi, 270 m from the big gold temple.', p: 51 },
    { id: 'sleepmai', l: 'Sleep Mai Tha Phae', s: 'Rated 4.7 from 997. Pool, 700 m from the gate.', p: 60 },
    { id: 'estia', l: 'Estia Chiang Mai', s: 'Rated 4.7 from 1,168. Pool and hot tub, 260 m from Wat Chedi Luang.', p: 67 },
    { id: 'vijit', l: 'THEE Vijit Lanna', s: 'Elevator, two pools, sends a car to the airport.', p: 139 } ] },
  { id: 'stopover', title: 'The night in Abu Dhabi', mode: 'one', o: [
    { id: 'free', l: 'The free Etihad hotel', s: 'Ask for Aloft. Room only, about $14 in fees.', p: 14 },
    { id: 'rayhaan', l: 'Pick our own: Khalidiya Palace', s: '5-star on the beach, rated 9.0.', p: 99 },
    { id: 'skip', l: 'Skip the city, fly straight through', s: 'Two hours in the airport. You gain a whole extra day in Bangkok.', p: 0 } ] },
  { id: 'layover', title: 'The night at Abu Dhabi airport, going home', mode: 'one', o: [
    { id: 'wait', l: 'Rest in the terminal', s: 'Free. Chairs, from 12:30 to 9 AM.', p: 0 },
    { id: 'lounge', l: 'A lounge with recliners', s: 'Showers and food, $50 each.', p: 100 },
    { id: 'airhotel', l: 'A room inside the terminal', s: 'A real bed for six hours.', p: 125 } ] },

  { id: 'food', title: 'Food for six days', mode: 'one', o: [
    { id: 'street', l: 'Market and street food, about $2 a meal', s: 'Food courts and famous stalls. Clean, cooked to order. About $15 a day for both.', p: 90 },
    { id: 'mixfood', l: 'Stalls at lunch, restaurants at dinner', s: 'About $40 a day.', p: 240 },
    { id: 'ac', l: 'Restaurants with air conditioning', s: 'About $60 a day.', p: 360 } ] },
  { id: 'transport', title: 'Getting around Thailand', mode: 'one', o: [
    { id: 'bolt', l: 'Bolt for everything', s: 'Bolt is 40% under Grab on the airport run. Door to door, no stairs, no station lifts to hunt for.', p: 110 },
    { id: 'mixtx', l: 'Trains and boats, Bolt when tired', s: 'Cheapest, but the hospital station has no lift.', p: 85 },
    { id: 'driver', l: 'A private driver on the two big days', s: 'A car and driver waiting, in each city.', p: 220 } ] },

  { id: 'auhday', title: 'Abu Dhabi: what you do with the one day', mode: 'one', o: [
    { id: 'auh_frugal', l: 'Mosque, free shuttle, souk terrace', s: 'The 9 AM courtyard, a free shuttle to the memorial, coffee looking back at the mosque across the water.', p: 60 },
    { id: 'auh_camel', l: 'Camels in the desert, then the mosque', s: 'A 3-hour morning desert trip with a real camel ride. The desert at 8 AM is 30C, cooler than the city. Skip the dune bashing.', p: 150 },
    { id: 'auh_big', l: 'Camels, the mosque, the Louvre and oud', s: 'The full day, at a slower pace, with time to choose a bottle of oud properly.', p: 300 },
    { id: 'auh_dubai', l: 'Drive to Dubai for the day', s: 'Not recommended: the Burj Khalifa deck is closed for renovation, the fountains do not run before 4 PM, and 3 to 4 of the 6 hours are in a car.', p: 447 } ] },
  { id: 'oud', title: 'Abu Dhabi: Dad’s oud and Mom’s market', mode: 'many', o: [
    { id: 'souk_visit', l: 'Both markets: Mina Zayed at 8, Madinat Zayed at 9', s: 'Free. The open-air date and spice market while it is cool, then the indoor perfume and gold souk. All 61 jewellers on one flat floor.', p: 0 },
    { id: 'oud_bottle', l: 'A real bottle of oud', s: 'Genuine oud runs $39 to $65 a millilitre, so a small bottle is $70 to $120. Anything at $14 a bottle is not oud. Legal limit 24 ml each.', p: 95 },
    { id: 'oud_gift', l: 'Attar, incense and dates to bring home', s: 'Ajmal, Rasasi and Swiss Arabian are the honest affordable houses. Dates are at peak harvest that week. No charcoal on the plane.', p: 40 } ] },

  { id: 'bkk_sight', title: 'Bangkok: the one big sight', mode: 'one', o: [
    { id: 'free_temples', l: 'The near-free temples, and Museum Siam', s: 'Wat Saket’s golden mount, Wat Traimit’s solid gold Buddha. Museum Siam is free at 60 and over with a passport.', p: 12 },
    { id: 'watpho', l: 'Wat Pho and Wat Arun, skip the palace', s: 'The 150-foot reclining Buddha, then the 15-cent ferry across to the tower. The same photographs for a third of the price.', p: 30 },
    { id: 'palace', l: 'The Grand Palace, Wat Pho and Wat Arun', s: 'The full morning. The palace alone is $30 each and involves 2 to 3 km of walking.', p: 90 } ] },
  { id: 'bkk_water', title: 'Bangkok: something on the water', mode: 'one', o: [
    { id: 'boat', l: 'The public river boat at sunset', s: 'About 70 cents each. Past the temples and under the bridges. Better value than any rooftop bar and no dress code.', p: 3 },
    { id: 'floating', l: 'A floating market, the Sunday only', s: 'Taling Chan or Khlong Lat Mayom. Every floating market near Bangkok is weekend-only, so this is the one chance, on the morning you land. It clashes with Chatuchak.', p: 30 },
    { id: 'longtail', l: 'A private longtail boat through the canals', s: 'The old wooden houses on stilts, an hour. Hire a private one: the public canal boat does not come to a full stop.', p: 45 },
    { id: 'nowater', l: 'Nothing on the water', s: '', p: 0 } ] },
  { id: 'bkk_market', title: 'Bangkok: a market to buy things in', mode: 'many', o: [
    { id: 'chatuchak', l: 'Chatuchak weekend market, the Sunday', s: 'Free to walk in. 15,000 stalls. It IS open the Sunday they land. Fabric, gifts, everything.', p: 0 },
    { id: 'talatnoi', l: 'Talat Noi and the Chinatown lanes on foot', s: 'Free. The best free half-day in Bangkok: old shophouses, shrines, coffee.', p: 0 },
    { id: 'flowers', l: 'The flower market at night', s: 'Free. Orchids and marigolds by the sack at 10 PM.', p: 0 },
    { id: 'gifts', l: 'Money for gifts and fabric to bring home', s: 'Scarves $3, silk $8, elephant trousers $3, ceramics $6.', p: 60 } ] },
  { id: 'bkk_daytrip', title: 'Bangkok: a day out of the city', mode: 'one', o: [
    { id: 'ayutthaya', l: 'Ayutthaya, the ruined old capital, half a day', s: 'A new air-conditioned train, an hour each way, $1.50 each. Two or three ruins and the reclining Buddha, back before the afternoon rain. A full day there is 12 hours with no shade.', p: 40 },
    { id: 'noday', l: 'Stay in the city', s: '', p: 0 } ] },
  { id: 'bkk_hands', title: 'Bangkok: something with your hands', mode: 'many', o: [
    { id: 'massage_cheap', l: 'An oil or foot massage', s: 'An hour each, $9 for the two of you. Ask for oil or foot, not traditional Thai: the joint-cracking kind carries a real injury risk at 70.', p: 18 },
    { id: 'massage_watpho', l: 'A foot massage at the Wat Pho school', s: 'Where Thai massage is taught, in the temple grounds. An hour each.', p: 32 },
    { id: 'cooking_bkk', l: 'A Thai cooking class in Bangkok', s: 'Market tour, then you cook four dishes and eat them. Cheaper in Chiang Mai.', p: 76 } ] },
  { id: 'bkk_night', title: 'Bangkok: the birthday evening', mode: 'one', o: [
    { id: 'chinatown', l: 'Chinatown street food under the neon', s: 'Grilled prawns and sea bass at a famous corner. Chairs, not stools. Loud and unforgettable.', p: 25 },
    { id: 'boat_dinner', l: 'The sunset boat, then dinner by the river', s: 'The 70-cent boat at golden hour, then a riverside table.', p: 35 },
    { id: 'mahanakhon', l: 'The glass skywalk at sunset', s: 'Half price at 60 and over: $15 each instead of $30. Buy at the counter with your passports, because booking online loses the discount.', p: 30 },
    { id: 'supanniga', l: 'A rooftop table facing the lit-up temple', s: 'Booked ahead. The $62 minimum for the table is the dinner.', p: 62 } ] },

  { id: 'cnx_animals', title: 'Chiang Mai: the elephants', mode: 'one', o: [
    { id: 'noeleph', l: 'No elephants', s: '', p: 0 },
    { id: 'elephants', l: 'Elephant Nature Park, half day', s: 'A rescue sanctuary. You walk beside them on a flat path and feed them. No riding, no shows. $77 each.', p: 154 } ] },
  { id: 'cnx_do', title: 'Chiang Mai: the rest', mode: 'many', o: [
    { id: 'monkchat', l: 'A monk chat at Wat Suan Dok', s: 'Free. Weekday mornings. You sit with a young monk and ask him anything. The best free thing in the whole trip.', p: 0 },
    { id: 'alms', l: 'The dawn alms round', s: 'Under $5. You kneel with rice and fruit as the monks pass at 6:40 AM.', p: 5 },
    { id: 'suthep', l: 'The mountain temple with a driver', s: 'Doi Suthep at 7 AM before the cloud. A cable car up the last stretch, so no 306 steps.', p: 30 },
    { id: 'cooking_cnx', l: 'A Thai cooking class', s: 'Half the Bangkok price and walking distance from the gate. Market tour, then you cook and eat.', p: 61 },
    { id: 'silver', l: 'The silversmiths on Wualai Road', s: 'Free to watch them hammer silver by hand.', p: 0 },
    { id: 'cnx_massage', l: 'A Thai massage', s: 'An hour each.', p: 20 } ] },

  { id: 'phone', title: 'Phone service', mode: 'one', o: [
    { id: 'roam', l: 'Use our US plan abroad', s: 'Free on the bigger T-Mobile plans. $12 a day per phone on Verizon and AT&T.', p: 0 },
    { id: 'esim1', l: 'One eSIM, shared', s: 'Dad’s phone shares its internet with Mom’s.', p: 25 },
    { id: 'airportsim', l: 'SIM cards at the Bangkok airport', s: 'A counter swaps the card in five minutes. Bring the passport.', p: 30 },
    { id: 'esim2', l: 'One eSIM each', s: 'Both phones work on their own.', p: 50 } ] },
  { id: 'insurance', title: 'Travel insurance', mode: 'one', o: [
    { id: 'ins', l: 'Yes', s: 'Medical and a flight home if needed. Medicare covers nothing abroad.', p: 200 },
    { id: 'noins', l: 'No', s: 'Not recommended at 70.', p: 0 } ] },
  { id: 'misc', title: 'Odds and ends', mode: 'many', o: [
    { id: 'tips', l: 'Tips, water, snacks', s: '', p: 40 } ] },
  { id: 'medical', title: 'Medical, outside the $3,500', mode: 'many', outside: true, o: [
    { id: 'chk_basic', l: 'Basic check-ups for both', s: 'Bloods, heart tracing, x-ray, ultrasound. Skips PSA, mammogram and bone density.', p: 1137 },
    { id: 'chk_one', l: 'A full check-up for one of you', s: 'At Bangkok Hospital.', p: 1023 },
    { id: 'chk_bkh', l: 'Full check-ups for both, Bangkok Hospital', s: 'Built for your age, a third less than Bumrungrad. A 20-minute taxi. Book 7 days ahead.', p: 2046 },
    { id: 'chk_70', l: 'Full check-ups for both, Bumrungrad', s: 'The same tests, walking distance from the hotel, more expensive.', p: 2834 },
    { id: 'dental_ext', l: 'Dad: pulling a tooth', s: 'One visit, Monday morning.', p: 65 },
    { id: 'dental_rct', l: 'Dad: a root canal', s: 'The dentist confirms you can fly two days later.', p: 523 },
    { id: 'dental_crown', l: 'Dad: a crown', s: 'Prepared Monday, fitted Wednesday. Two-year warranty.', p: 677 },
    { id: 'dental_implant', l: 'Dad: an implant, first half', s: 'The post now. The tooth itself needs a second trip.', p: 2000 } ] }
];
const EXCLUSIVE = [
  ['chk_bkh','chk_70','chk_basic','chk_one'],
  ['dental_crown','dental_rct','dental_ext','dental_implant'],
  ['massage_cheap','massage_watpho']
];
const BUDGET = 3500;
function groupOff(id, sel) {
  const eti = sel.flights === 'etihad', stop = sel.stopover !== 'skip';
  if (['bags','stopover','layover'].includes(id) && !eti) return true;
  if (['auhday','oud'].includes(id) && (!eti || !stop)) return true;
  return false;
}
function groupTotal(g, sel, base) {
  if (groupOff(g.id, sel)) return 0;
  if (g.mode === 'one') { const o = g.o.find(o => o.id === sel[g.id]); return o ? o.p : 0; }
  return g.o.filter(o => (sel[g.id] || []).includes(o.id)).reduce((s, o) => s + (o.dyn === 'buffer' ? base * 0.10 : o.p), 0);
}
function totals(sel) {
  let inside = 0; CATALOG.filter(g => !g.outside).forEach(g => { inside += groupTotal(g, sel, 0); });
  return { inside, cushion: Math.round(inside * 0.10), outside: groupTotal(CATALOG.find(g => g.id === 'medical'), sel, 0), base: inside };
}
const fmtMoney = n => '$' + Math.round(n).toLocaleString('en-US');

/* Fit the trip inside the budget. Trims in order of least regret, and says what it gave up. */
const TRIM_ORDER = [
  { g: 'bkk_market', drop: 'gifts', say: 'the gift money' },
  { g: 'oud', drop: 'oud_bottle', add: 'oud_gift', say: 'the good bottle of oud, kept a gift set' },
  { g: 'food', to: 'mixfood', from: ['ac'], say: 'the air-conditioned restaurants, kept a mix' },
  { g: 'phone', to: 'esim1', from: ['esim2'], say: 'the second phone plan, sharing one instead' },
  { g: 'transport', to: 'bolt', from: ['driver'], say: 'the private driver' },
  { g: 'bkk_night', to: 'mahanakhon', from: ['supanniga'], say: 'the rooftop table, kept the sunset skywalk' },
  { g: 'bkk', to: 'citypark', from: ['adlib', 'amber'], say: 'the hotel by the hospital' },
  { g: 'cnx', to: 'sleepmai', from: ['vijit', 'estia'], say: 'a nicer Chiang Mai hotel' },
  { g: 'domestic', to: 'vietjet', from: ['mix'], say: 'the full-service flight home from Chiang Mai' },
  { g: 'layover', to: 'lounge', from: ['airhotel'], say: 'the airport room, kept a lounge' },
  { g: 'bkk_sight', to: 'watpho', from: ['palace'], say: 'the Grand Palace, kept Wat Pho and Wat Arun' },
  { g: 'food', to: 'street', from: ['mixfood'], say: 'restaurant dinners, eating at markets instead' },
  { g: 'bkk_water', to: 'boat', from: ['floating', 'longtail'], say: 'the floating market, kept the river boat' },
  { g: 'bkk', to: 'ratchada', from: ['citypark', 'hopinn'], say: 'a step down in hotel' },
  { g: 'cnx', to: 'rompo', from: ['sleepmai', 'phrasingh'], say: 'a step down in Chiang Mai' },
  { g: 'transport', to: 'mixtx', from: ['bolt'], say: 'door-to-door cars, using trains and boats' },
  { g: 'layover', to: 'wait', from: ['lounge'], say: 'the lounge, resting in the terminal' },
  { g: 'phone', to: 'roam', from: ['esim1', 'airportsim'], say: 'the local phone plan' },
  { g: 'bkk_daytrip', to: 'noday', from: ['ayutthaya'], say: 'the day trip to Ayutthaya' },
  { g: 'bkk_night', to: 'chinatown', from: ['mahanakhon', 'boat_dinner'], say: 'the paid birthday view, kept Chinatown' },
  { g: 'auhday', to: 'auh_camel', from: ['auh_big', 'auh_dubai'], say: 'the long Abu Dhabi day, kept the camels' },
  { g: 'bkk_hands', drop: 'cooking_bkk', say: 'the Bangkok cooking class' },
  { g: 'cnx_do', drop: 'cooking_cnx', say: 'the cooking class' },
  { g: 'cnx_animals', to: 'noeleph', from: ['elephants'], say: 'the elephant sanctuary' },
  { g: 'auhday', to: 'auh_frugal', from: ['auh_camel'], say: 'the camels' }
];
function fitBudget(sel, limit) {
  const s = JSON.parse(JSON.stringify(sel)), gave = [];
  for (const step of TRIM_ORDER) {
    if (totals(s).inside <= limit) break;
    const cat = CATALOG.find(g => g.id === step.g); if (!cat) continue;
    if (groupOff(step.g, s)) continue;
    let changed = false;
    if (cat.mode === 'one') { if (step.from.includes(s[step.g])) { s[step.g] = step.to; changed = true; } }
    else { const arr = s[step.g] || []; if (step.drop && arr.includes(step.drop)) { s[step.g] = arr.filter(x => x !== step.drop); if (step.add && !s[step.g].includes(step.add)) s[step.g].push(step.add); changed = true; } }
    if (changed) gave.push(step.say);
  }
  return { sel: s, gave, total: totals(s).inside, fits: totals(s).inside <= limit };
}
