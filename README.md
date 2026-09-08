# Personal Command Center — iPhone Edition

A local-first personal web app designed specifically for a single iPhone.

## Included
- Purple mobile-first dashboard
- Net Worth: TSP, Vanguard, Schwab, Cash & Money Market, Home Equity, Other Assets
- Planes Near Me → Flightradar24
- Travel
- Houses
- Shopping
- Recipes
- 3D Print List
- Short-Term Goals
- Long-Term Goals
- Projects
- Tasks
- Quick Add
- Local iPhone storage using IndexedDB
- Backup My Data / Restore Backup

## No server database
There is no PostgreSQL, SQLite server, Clerk account, Node backend, or paid API requirement.

## Hosting
Because iPhone Safari will not install a PWA directly from local files, host these static files on any HTTPS static host.
Good free choices:
- Cloudflare Pages
- GitHub Pages

Then open the HTTPS address in Safari and use Share → Add to Home Screen.

## Important
Your personal data stays in the browser on the iPhone. The website files do not contain your private records.
Use Backup My Data periodically and save the JSON file to iCloud Drive.
