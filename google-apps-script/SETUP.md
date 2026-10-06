## Google Sheets + Email setup

This site is now prepared to send both forms to a Google Apps Script web app instead of `formsubmit`.

### 1. Create the Google Sheet

Create a spreadsheet for submissions and copy its ID from the URL:

`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

### 2. Create the Apps Script project

In Google Drive:

1. Open `script.new`
2. Replace the default code with [`google-apps-script/Code.gs`](./Code.gs)
3. Save the project

### 3. Add script properties

In Apps Script, open `Project Settings` and add these script properties:

- `SHEET_ID` = your spreadsheet ID
- `NOTIFY_EMAIL` = the inbox for contact enquiries and bookings other than the two surgery categories below
- `BUSINESS_NAME` = `Foot & Ankle Centre`
- `SITE_SUCCESS_URL` = `https://www.footandanklecentre.co.uk/success/`
- `TURNSTILE_SECRET` = the Cloudflare Turnstile secret key, not the public site key
- `TURNSTILE_ENFORCE` = `true`
- `TURNSTILE_ALLOWED_HOSTS` = `footandanklecentre.co.uk,www.footandanklecentre.co.uk`

`TURNSTILE_ENFORCE` now defaults to on. Only set it to `false` temporarily while testing, because direct POSTs to the Apps Script URL can otherwise bypass the browser widget.

### 4. Deploy as a web app

1. Click `Deploy` -> `New deployment`
2. Choose `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone`
5. Deploy and authorize
6. Copy the `/exec` web app URL

### 5. Add the web app URL to both forms

Set `data-form-endpoint` in these files to the deployed `/exec` URL:

- [index.html](../index.html)
- [booking.html](../booking.html)

Example:

```html
<form
  class="contact-form"
  action=""
  method="POST"
  data-form-endpoint="https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec"
  data-form-type="contact">
```

Use the same Apps Script URL for both forms. The hidden `formType` field tells the script whether to write to `Contact Responses` or `Booking Responses`.

### 6. Test both forms

Submit one contact form response and one booking request. Confirm:

- A row appears in the correct sheet tab
- A notification email reaches `NOTIFY_EMAIL`
- The browser lands on `/success/`
- A direct POST without `cf-turnstile-response` is rejected and does not add a row to `Form Responses`

### Notes

- Booking requests for `Foot & Ankle Surgery` or `Cosmetic Foot Surgery` go to `smit.christian@footandanklecentre.co.uk`, with `enquiries@footandanklecentre.com` in CC. The patient's email remains the Reply-To address. The Email Log records both recipients.
- Chatbot surgery quotation enquiries include the surgery type and photo attachments, and go to `smit.christian@footandanklecentre.co.uk`, with `enquiries@footandanklecentre.com` in CC. The patient's email remains the Reply-To address.
- To activate this routing on an existing deployment, copy the updated `Code.gs` into the live Apps Script project, save, then choose `Deploy` -> `Manage deployments` -> edit the existing web app -> `New version` -> `Deploy`. This keeps the current form endpoint URL.
- Emails are sent from the Google account that owns the Apps Script deployment.
- If you change the script later, redeploy the web app version if Google prompts you to.
- The hidden `website` field is only a basic bot trap. Turnstile must be verified in Apps Script to protect the public `/exec` endpoint.
