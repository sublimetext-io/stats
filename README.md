Mini "serverless" stats tracker for Package Control. "wrangler" is Cloudflare.

```
npm install

; To create the db locally
npx wrangler d1 execute package-tracker-db --file=./schema.sql

npx wrangler dev

; test it
curl 'http://127.0.0.1:8787/event?pkg=GitSavvy&type=install'
curl 'http://127.0.0.1:8787/event?pkg=SublimeLinter&type=install'

curl 'http://127.0.0.1:8787/totals?pkg=GitSavvy'

curl 'http://127.0.0.1:8787/all-totals?key=supersecretkey'


;; deploy is basically
npx wrangler secret put INGEST_KEY
npx wrangler d1 create package-tracker-db
npx wrangler d1 execute package-tracker-db --file=./schema.sql --remote
npx wrangler deploy
```

