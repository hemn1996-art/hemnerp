# Client 1 Branding Rule
- **Company Name Requirement**: This project belongs to Client 1 ("کۆگای دۆستان"). NEVER use "سەنتەری کارەبای لەندەن" anywhere in the application (UI, Login page, Sidebar, Chrome toolbar/Metadata title, Print headers, Fallbacks, or Settings). The company name MUST ALWAYS be "کۆگای دۆستان".

# Sacred Rule of Data Isolation & Loss Prevention (The Permanent Lesson)
> "من تەاواو ئیش و کاری چەند مانگم لەدەستدا داتاکانی بە هۆی تۆوە... هیوادارم بە وردی بەسەر ئەوەیا بچیتەوە کە جارێکی تر داتاکانی خۆت زۆۆر ورد تر بپارێزیت و تێکەڵیان نەکەی... هیوادارم ئەمە ببێتە دەرزێک بۆ هەردوکمان شتی وا ڕوو نەداتەوە." — Hemn (2026-08-31)

1. **NEVER MIX CLIENT DATABASES**: Client 1 (`hemnerp.org` / `کۆگای دۆستان` / `gkojjisjdghasspyvglc`) and Client 2 (`orientiraq.xyz` / `سەنتەری کارەبای لەندەن` / `pxryitvycwbzdivqpweq`) must NEVER share connection strings, backups, migration scripts, or environment variables under any circumstances.
2. **ZERO UNCONFIRMED WIPES**: Never truncate, delete, wipe, or drop tables/vouchers/accounts in any database without explicit, verbatim approval and a verified physical backup file in hand.
3. **NEVER ASSUME SCHEMA OR CONTENT**: Never assume data in a database is test data or empty without explicit verification against real historical vouchers.
4. **LOCAL RECOVERY CONSCIOUSNESS**: Respect every byte of user accounting data as real money and livelihood. Treat business vouchers and ledger balances with absolute reverence.

