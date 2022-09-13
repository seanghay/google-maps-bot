import { launch, devices } from 'puppeteer-core';


const timeout = (t) => new Promise(r => setTimeout(r, t))

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  : process.platform === 'linux'
    ? '/usr/bin/google-chrome'
    : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';


const _browser = await launch({
  headless: true,
  executablePath,
  args: [
    '--lang=fr' 
  ]
});

const browser = await _browser.createIncognitoBrowserContext();

/**
 * @returns {Promise<import("puppeteer-core").Target>}
 */
async function waitForTarget() {
  return new Promise(r => browser.on('targetcreated', r))
}

const page = await browser.newPage();

page.setViewport({
  width: 1366,
  height: 768,
  deviceScaleFactor: 1,
})

const set = new Set();
page.setRequestInterception(true);
page.on('request', (request) => {
  if (request.resourceType() === 'image') {
    request.abort();
    if (request.url().match(/(\=s\d+-k-no)$/)) {
      const imageUrl = request.url().replace(/(\=s\d+-k-no)$/, "") + "=s0"
      set.add(imageUrl);
    }
  } else {
    request.continue();
  }
})

await page.goto("https://www.google.com/maps/place/Starbucks/@11.5539676,104.9228191,17z/data=!4m5!3m4!1s0x310951252d9073d9:0xe532d527124a687!8m2!3d11.5539676!4d104.9250078");
const elements = await page.$$('[data-item-id]')

const info = {};

for (const element of elements) {
  let [type, value] = await element.evaluate((e) => [
    e.getAttribute('data-item-id'),
    e.getAttribute('href') || e.getAttribute('aria-label') || e.textContent,
  ]);

  if (/^phone:/.test(type)) {
    const phone = type.split(':')[2];    
    if (phone) {
      value = phone;
    }

    type = "phone_number";
  }

  info[type] = value && value.trim();
}

const timeElements = await page.$$('tbody tr td button[data-value]');

for (const tElement of timeElements) {
  const value = await tElement.evaluate(e => e.getAttribute('data-value'));
  const [weekday, hourRange] = value.split(',');

  info.working_hours = {
    ...info.working_hours || {},
    [weekday]: hourRange,
  }
}

const categoryElement = await page.$('[jsaction="pane.rating.category"]');
info.category = await categoryElement.evaluate(e => e.textContent);

const metaElements = await page.$$('meta[property]')

for (const meta of metaElements) {
  const [property, content] = await meta.evaluate(e => [e.getAttribute('property'), e.getAttribute('content')]);
  if (property.startsWith('og:'))  {
    const field = property.replace(/og:/, '').replace(/:/, '_');
    let rating = false;

    if (/([☆★]+)/.test(content)) {
      const [star] = /([☆★]+)/.exec(content);
      if (star) {
        const starResult = /★+/.exec(star)
        if (starResult && starResult[0]) {
          rating = starResult[0].length;
        } else {
          rating = 0;
        }
      }
    }

    const fieldValue = content.split('·').map(it => it.trim())
  
    info.meta = {
      ...info.meta || {},
      [field]: fieldValue.length === 1 ? fieldValue[0] : fieldValue
    }

    if (rating !== false) {
      info.meta.rating = rating;
    }
  }
}


await page.waitForSelector('button[data-carousel-index="0"]');
await page.click('button[data-carousel-index="0"]');
await page.waitForSelector('a[data-photo-index="0"');

for (let i = 0; i < 10; i++) {
  const el = await page.$(`a[data-photo-index="${i}"`);
  if (el) {
    await page.click(`a[data-photo-index="${i}"`);
    await page.waitForNavigation();
  }
}


info.feature_photo = info.meta && info.meta.image.replace(/=.+-k-no-p$/, '=s0')
info.photos = Array.from(set)
console.log(info)

await page.close();
await _browser.close();
