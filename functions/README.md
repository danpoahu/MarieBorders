# Marie Borders — Cloud Functions

Resend-backed email pipeline. Five Firestore-create triggers send admin
notifications and visitor auto-replies for each lead collection.

## Prerequisites (one-time, all blocking)

1. **Blaze plan** enabled on Firebase project `mbreal-83286`. (Free tier still
   covers expected volume; Blaze is required only to run Cloud Functions.)
2. **Resend account** at resend.com with `marieborders.com` verified
   (SPF + DKIM TXT records added via GoDaddy).
3. **Sender `marie@marieborders.com`** verified in Resend.

## Deploy

```bash
cd /Volumes/Xcode_Projects/MarieBorders
npm --prefix functions install

# Store the Resend API key as a Firebase secret (NOT in code)
firebase functions:secrets:set RESEND_API_KEY
# (paste the API key when prompted)

firebase deploy --only functions
```

## Verify

```bash
firebase functions:log --only onContactInquiryCreate
```

Submit the website contact form, watch the log, confirm two emails arrive
(one to `mariebordershometeam@gmail.com`, one to the test visitor).

## Where things live

| File | What |
|------|------|
| `index.js` | The five `onDocumentCreated` triggers + the `runPipeline` shared sender |
| `lib/template.js` | `{{var}}` substitution. A mirror lives at `STAGE/assets/js/email-template-preview.js` for the CMS preview |
| `lib/formatters.js` | Number / list / timeline / address formatters |
| `lib/defaultTemplates.js` | The 10 default templates (5 inquiry types × 2 audiences). Also the variable reference metadata the CMS displays. |

## Backend routing constants

Edit `BRAND` at the top of `index.js` to change:

- `fromEmail` / `fromName` — what visitors see in the From line
- `adminTo` — Anne's address (gets the admin notification)
- `adminBcc` — Marie's brokerage address (BCC of admin emails)

Then redeploy. These are intentionally NOT editable from the CMS — only the
template subject and body are.

## Template editing

Marie edits subject + body for any of the 10 templates from the CMS
"Email Templates" tab. Edits are saved to Firestore `emailTemplates/{id}`.
If a template doc is missing or empty, the CF falls back to the defaults in
`lib/defaultTemplates.js`.
