const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.error('BROWSER ERROR:', error));

    try {
        await page.goto('http://localhost:5174', { waitUntil: 'load' });
        console.log('Page loaded successfully');
    } catch (err) {
        console.error('Failed to load page:', err);
    }

    await browser.close();
})();
