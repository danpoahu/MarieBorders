/**
 * One-time seed script — loads Marie's real, published client reviews into
 * Firestore `reviews`, matching the exact schema the CMS Reviews tab writes.
 *
 * WHERE THESE CAME FROM
 *   Every quote below is a real review left by a real client on a public
 *   profile. Nothing here is invented. Sources:
 *     - Zillow  https://www.zillow.com/profile/HomesbyMarieBorders  (5.0, 35 reviews)
 *     - Yelp    https://www.yelp.com/biz/marie-borders-marins-finest-novato (5.0, 19 reviews)
 *
 * WHAT WAS EDITED, AND WHAT WAS NOT
 *   - Reviews run 200-1,450 characters; the carousel reads best around 200.
 *     Long ones are TRIMMED, never reworded. Every cut is marked with a real
 *     ellipsis character. Words inside a quote are the client's own.
 *   - Obvious transcription typos in the source are corrected ("I've know" ->
 *     "I've known", "There were extremely happy" -> "They were extremely
 *     happy", "could't" -> "couldn't"). Nothing else is touched.
 *   - Four Zillow reviewers show only a username (greatchinaco, kyunkim36,
 *     noyce, ldavisrda). Rather than print a forum handle under a testimonial,
 *     those carry a factual description drawn from Zillow's own work summary
 *     ("A San Rafael buyer"). One of them signs the review body "Greg & Leslie
 *     Davis", so that one keeps the real name.
 *
 * FULL ORIGINAL TEXT is preserved in the `_full` field on each entry below for
 * reference. It is stripped before writing — the CMS has no field for it, and a
 * field the CMS cannot see would be invisible to Marie.
 *
 * Authentication via Application Default Credentials, same as
 * tools/seed-saddlebrook.js. If this fails with a permission error, run once:
 *
 *   gcloud auth application-default login      (pick danpellegrini63@gmail.com)
 *
 * NOTE: ADC is often pointed at ldahhelp@gmail.com for LDAH work, which gets
 * PERMISSION_DENIED here. Switching it back to danpellegrini63 breaks LDAH
 * Firestore access until you switch again — that trade is the known cost.
 *
 * firebase-admin is not installed at the repo root; borrow the functions copy:
 *
 *   NODE_PATH=./functions/node_modules node tools/seed-reviews.js           # dry run
 *   NODE_PATH=./functions/node_modules node tools/seed-reviews.js --write   # commit
 *
 * Re-running is safe: each review has a stable document id, so a second run
 * overwrites rather than duplicating.
 */

'use strict';

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'mbreal-83286' });
const db = admin.firestore();

const ALL_PAGES = { home: true, about: true, forSale: true, contact: true };

/* Ordered strongest-first. Marie reorders by dragging in the CMS. */
const REVIEWS = [
  {
    id: 'zillow-karen-m-2026',
    clientName: 'Karen M.',
    where: 'Sold her home, 2026',
    rating: 5,
    date: '2026-04-11',
    source: 'zillow',
    text: 'As a first time seller from abroad, without wanting to travel to the US, I was nervous about international logistics. Marie put all of these fears to rest… In less than a week, there were multiple offers to be considered… I recommend her without reservation.',
    _full: 'As a first time seller, I was nervous about how to get the best price for my house as quickly as possible. As a first time seller from abroad, without wanting to travel to the US, I was nervous about international logistics. Marie put all of these fears to rest whilst doing her behind-the-scenes, 95+-item checklist magic, coordinating paperwork and legalities, property cleaning and tidying, staging, and inspections that saw the house taken to market quickly. In less than a week, there were multiple offers to be considered. There were one or two unforeseen logistics hiccups during the escrow process (see aforementioned "international logistics"), which she navigated through with composure, a lot of reassurance to me, and creative problem-solving. She kept me well-informed throughout, in spite of the time difference (which more than once meant stupid o\'clock phone calls for her!). "I\'ve got you," was what I needed to hear, and was what she said. Two days since closing, and I\'m still euphoric at how successful it\'s been. Selling my home has been a curious blend of emotion and business, and Marie has admirably handled both sides of this coin with kindness, caring, and understanding, along with a practical business savvy and in-depth knowledge of the local real estate landscape. I am in awe. If I were ever to do this again, either as a seller or buyer, she would absolutely be my go-to person. I recommend her without reservation.'
  },
  {
    id: 'zillow-davis-2025',
    clientName: 'Greg & Leslie Davis',
    where: 'Bought and sold in Penngrove, 2025',
    rating: 5,
    date: '2025-11-07',
    source: 'zillow',
    text: 'Marie guided us through both the emotional and practical challenges of selling a home that had been in our family for over 65 years… If you\'re buying or selling, you\'ll want Marie in your corner — she\'s simply the best in the business.',
    _full: 'Working with Marie Borders has been an incredible experience from start to finish. With over 25 years of real estate expertise, Marie guided us through both the emotional and practical challenges of selling a home that had been in our family for over 65 years. She handled every step with the utmost care and respect, even while managing a not-so-easy buyer\'s representative. Thanks to her professionalism, composure, and deep knowledge of the market, the outcome was better than we could have hoped for. Marie has also helped us purchase two homes, including our dream property in Penngrove, California. That deal was no small feat — there were 14 competing offers and a tight deadline, not to mention the pouring rain! Yet, Marie and her team went above and beyond, stayed steady under pressure, and successfully secured the home for us. We are beyond grateful for all she\'s done and can\'t recommend her highly enough. If you\'re buying or selling, you\'ll want Marie in your corner — she\'s simply the best in the business.'
  },
  {
    id: 'zillow-novato-client-2022',
    clientName: 'A Novato client',
    where: 'Novato, 2022',
    rating: 5,
    date: '2022-11-09',
    source: 'zillow',
    text: 'Marie Borders is simply the finest real estate professional with whom I\'ve ever worked in over 5 decades of buying real estate in Northern California. Marie\'s exemplary and unparalleled professionalism, resourcefulness, expertise… set the gold standard within the real estate industry.',
    _full: 'Marie Borders is simply the finest real estate professional with whom I\'ve ever worked with in over 5 decades of buying real estate in Northern California. Marie\'s exemplary and unparalleled professionalism, resourcefulness, expertise, attention to detail, positive energy, compassion, generosity, and thoughtfulness set the gold standard within the real estate industry. Whether I\'m buying or selling real estate, Marie is the first person whom I\'m contact for her knowledgeable direction, support, and management. I wholeheartedly and enthusiastically recommend her services to all my family, friends, and colleagues with the complete faith and confidence that she\'ll provide the very best real estate experience possible. Her integrity, "can do" attitude, and willingness the go the extra mile to take care of every last detail are invaluable and immeasurable. It\'s always such a pleasure to work with Marie Borders and I\'m so grateful to do so!'
  },
  {
    id: 'yelp-mandy-r-2022',
    clientName: 'Mandy R.',
    where: 'Bought in a competitive market, 2022',
    rating: 5,
    date: '2022-01-30',
    source: 'yelp',
    text: 'Marie is a professional and caring agent with the expertise and market knowledge you want when looking to buy a home… She ultimately helped us buy a home in a competitive and fast-moving market. You can count on her to be the best addition to your team when looking to buy or sell.',
    _full: 'Marie is a professional and caring agent with the expertise and market knowledge you want when looking to buy a home. She spent over an hour helping us understand the home buying process before we were even ready to start looking. We knew we wanted to work with her when the time was right for us (and thankfully we did). She ultimately helped us buy a home in a competitive and fast-moving market. You can count on her to be the best addition to your team when looking to buy or sell.'
  },
  {
    id: 'yelp-alex-g-2020',
    clientName: 'Alex G.',
    where: 'Bought their first home, San Rafael, 2020',
    rating: 5,
    date: '2020-07-06',
    source: 'yelp',
    text: 'Marie is an amazing agent! She helped us buy our first home, and has now become part of the family, always available to answer our silly homeowner questions… We feel extremely lucky to have found Marie, and would recommend her to anyone that is considering buying or selling a home in the North Bay.',
    _full: 'Marie is an amazing agent! She helped us buy our first home, and has now become part of the family, always available to answer our silly homeowner questions as well as keep us informed of what is going on in the housing market. We feel extremely lucky to have found Marie, and would recommend her to anyone that is considering buying or selling a home in the North Bay. Thanks Marie!'
  },
  {
    id: 'yelp-lars-t-2022',
    clientName: 'Lars T.',
    where: 'Woodacre, 2022',
    rating: 5,
    date: '2022-11-23',
    source: 'yelp',
    text: 'Marie helped us navigate an extremely challenging environment by finding the needle in the haystack and securing the win in a highly competitive landscape. Our next purchase will be with Marie.',
    _full: 'If you are looking for a seasoned professional who can provide exemplary real estate services, look no further than Marie Borders. Marie helped us navigate an extremely challenging environment by finding the needle in the haystack and securing the win in a highly competitive landscape. Our next purchase will be with Marie.'
  },
  {
    id: 'yelp-tona-m-2022',
    clientName: 'Tona M.',
    where: 'Bought in Novato',
    rating: 5,
    date: '2022-11-17',
    source: 'yelp',
    text: 'I have used Marie Borders to buy my home a couple of years ago. She was diligent, friendly, and walked us through every step of the way. This year my sister was in the market to buy a home and upon recommending Marie Borders my sister found the home of her dreams. I highly recommend.',
    _full: 'I have used Marie Borders to buy my home a couple of years ago. She was diligent, friendly, and walked us through every step of the way. This year my sister was in the market to buy a home and upon recommending Marie Borders my sister found the home of her dreams. I highly recommend.'
  },
  {
    id: 'yelp-katie-a-2021',
    clientName: 'Katie A.',
    where: 'Helped sell her mother\'s condo, 2021',
    rating: 5,
    date: '2021-02-04',
    source: 'yelp',
    text: 'Marie is just the best… She helped my mother throughout the whole process of selling her condo… Marie embodies the perfect balance of patience, kindness, understanding and knowledge needed in helping my mother undertake such a huge life change.',
    _full: 'Marie is just the best. She is extremely professional and knowledgeable. She helped my mother throughout the whole process of selling her condo. This includes connecting with and helping her find a great retirement community and supporting her with all the Ins and outs of this huge life change. Marie has a wonderful network of other professionals who made my mothers move as easy as possible. Marie embodies the perfect balance of patience, kindness, understanding and knowledge needed in helping my mother undertake such a huge life change.'
  },
  {
    id: 'yelp-courtney-k-2020',
    clientName: 'Courtney K.',
    where: 'Sold in Napa, 2020',
    rating: 5,
    date: '2020-08-02',
    source: 'yelp',
    text: 'Marie went above and beyond expectations in helping us sell our Napa home. We were very pleased with the offer we received and the rapid timeline… Throughout the process Marie was friendly, prompt, courteous, and flexible. We couldn\'t have asked for a better experience.',
    _full: 'Marie went above and beyond expectations in helping us sell our Napa home. We were very pleased with the offer we received and the rapid timeline, especially since the sale closed in the midst of the Covid-19 pandemic. Throughout the process Marie was friendly, prompt, courteous, and flexible. We could\'t have asked for a better experience.'
  },
  {
    id: 'yelp-henedi-g-2022',
    clientName: 'Henedi G.',
    where: 'First-time buyer, Rohnert Park, 2022',
    rating: 5,
    date: '2022-10-19',
    source: 'yelp',
    text: 'I loved working with Marie!! 100% recommend. I had no idea how to start looking for a home and when I came to her for help she made it super easy and not stressful at all… when our offer got accepted she made the entire experience feel like a great achievement for my husband and I.',
    _full: 'I loved working with Marie!! 100% recommend, i had no idea how to start looking for a home and when I came to her for help she made it super easy and not stressful at all, she was available at any time for any questions I had. And when our offer got accepted she made the entire experience feel like a great achievement for my husband and I. I\'m very thank ful I got to work with her and will definitely continue working with her in the future.'
  },
  {
    id: 'zillow-bel-marin-keys-seller',
    clientName: 'A Bel Marin Keys seller',
    where: 'Bought and sold in Novato',
    rating: 5,
    date: '2022-11-11',
    source: 'zillow',
    text: 'Marie… used all her knowledge and experience to make it happen, which negated having to move our household twice. I absolutely recommend her for her professionalism, experience, but more than anything her willingness to share our dilemma to really help us.',
    _full: 'My wife and I met Marie through interviewing selected few realtors. It was apparent that Marie is not only professional having worked in this area but more importantly Marie came through to us that she wanted help us. Having selected Marie and her firm, they went to work. She kept us apprised of the proceedings very often and she continued to give us important advice. Now I need to tell you a small story. We were faced with situation where we not only had to sell the house we lived in but buy a house at the area we wanted. Very soon she found us a buyer with price we liked but placed a condition that we must move out in a relatively short time as they were temporarily renting a house. So Marie went to work to find us a home within the short time period. If she could not find our new home within the prescribed time period, we were faced with having to move twice which we obviously wanted to avoid. Then within a couple of days before the "date", she found us the house we wanted and the seller had to accept our offer within 24 hours of the agreed date. Marie, we think used all her knowledge and experience to make it happen which negated having to move our household twice. I absolutely recommend her for her professionalism, experience but more than anything her willingness to share our dilemma to really help us.'
  },
  {
    id: 'yelp-bob-d-2022',
    clientName: 'Bob D.',
    where: 'Marin County, 2022',
    rating: 5,
    date: '2022-11-23',
    source: 'yelp',
    text: 'I have known Marie for 8 years. I have had five friends purchase homes through her. They were extremely happy with the work she provided for them. Very knowledgeable in the Marin real estate market. Extremely professional. Very easy to work with. No pressure at all. She is simply the BEST!!',
    _full: 'I have known Marie for 8 years. I have had five friends purchase homes through her. There were extremely happy with the work she provided for them. Very knowledgeable in the Marin real estate market. Extremely professional. Very easy to work with. No pressure at all. She is simply the BEST!!'
  },
  {
    id: 'yelp-vance-a-2022',
    clientName: 'Vance A.',
    where: 'Santa Rosa, 2022',
    rating: 5,
    date: '2022-11-18',
    source: 'yelp',
    text: 'I\'ve known Marie Borders for well over 10 years. She has been an important part of the Novato community as well as a wonderful resource in the Real Estate market… She really listens to you. If you have the opportunity to meet her, please don\'t miss the chance.',
    _full: 'I\'ve know Marie Borders for well over 10 years. She has been an important part of the Novato community as well as a wonderful resource in the Real Estate market. I appreciate Marie\'s passion for supporting military veterans and their families, since I am the son of parents (my mother and father) that served. I\'ve always found Marie engaging when speaking with her. She really listens to you. If you have the opportunity to meet her, please don\'t miss the chance. Thank you Marie for all you do.'
  },
  {
    id: 'yelp-rachael-w-2022',
    clientName: 'Rachael W.',
    where: 'Novato, 2022',
    rating: 5,
    date: '2022-11-24',
    source: 'yelp',
    text: 'Even though we have not bought or sold a property with Marie… she has always been there for us, keeping us in touch with properties to check out and discuss. We would (and have) recommended Marie to others.',
    _full: 'Even though we have not bought or sold a property with Marie and she has been working with us for many years.....we are not easy decision makers.... she has always been there for us keeping us in touch with properties to check out and discuss... We would ( and have) recommended Marie to others...and she will [source page truncates here]'
  },
  {
    id: 'zillow-san-rafael-buyer',
    clientName: 'A San Rafael buyer',
    where: 'San Rafael, 2022',
    rating: 5,
    date: '2022-11-14',
    source: 'zillow',
    text: 'We had the chance to work with Marie for a short time as the housing market bubble slowed in 2022. We were not able to close on a property, but we would work with her again. She\'s a bulldog for the buyer.',
    _full: 'We had the chance to work with Marie for a short time as the housing market bubble slowed in 2022. We were not able to close on a property, but we would work with her again. She\'s a bulldog for the buyer.'
  }
];

async function main() {
  const write = process.argv.includes('--write');

  const existing = await db.collection('reviews').get();
  console.log('reviews already in Firestore: ' + existing.size);
  existing.forEach(d => console.log('   - ' + d.id + '  ' + JSON.stringify(d.get('clientName'))));

  console.log('\nseeding ' + REVIEWS.length + ' reviews' + (write ? '' : '  (DRY RUN — pass --write to commit)'));

  let batch = db.batch();
  REVIEWS.forEach((r, i) => {
    const { id, _full, ...fields } = r;
    const payload = Object.assign({}, fields, {
      published: true,
      pages: Object.assign({}, ALL_PAGES),
      order: i,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: null
    });
    console.log('  [' + i + '] ' + payload.clientName + '  (' + payload.text.length + ' chars, ' + payload.source + ')');
    if (write) batch.set(db.collection('reviews').doc(id), payload, { merge: false });
  });

  if (!write) { console.log('\nnothing written.'); return; }

  await batch.commit();
  console.log('\nwrote ' + REVIEWS.length + ' reviews.');

  const after = await db.collection('reviews').get();
  console.log('reviews now in Firestore: ' + after.size);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
