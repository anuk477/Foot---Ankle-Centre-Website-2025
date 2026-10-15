FAC Status v6 - Google Sheet only

Reason:
The Outlook category API is returning "An internal error has occurred" for this
IONOS IMAP mailbox in Outlook for Mac. This version does NOT call the Outlook
category API at all.

What it does:
- Reads the ENQ-... ID from the selected email subject.
- Sends the selected status to your secure PHP proxy.
- Updates the matching Google Sheet row.

What it does NOT do:
- It does not apply an Outlook colour/category to the message itself.

Upload all website files to:
https://www.footandanklecentre.co.uk/outlook-addin-v6/

Deploy Now setup:
- Add a GitHub Actions repository secret named OUTLOOK_STATUS_SECRET. Its value
  must match OUTLOOK_STATUS_SECRET in the Google Apps Script properties.
- The workflow passes this to scripts/package-deployment.js, which creates the
  private status-config.php in dist. The build fails if the secret is missing.
- Commit status-proxy.php, .htaccess, and the taskpane files. Never commit
  status-config.php: it contains the private shared secret.
- For local packaging, the ignored status-config.php can supply the existing
  secret instead. CI always requires the GitHub Actions secret.
- Keep this as a PHP-enabled Deploy Now project. Static-only hosting cannot run
  the proxy. No database is required.

Migration troubleshooting:
- status-proxy.php must return JSON, not 404 HTML. A GET should return 405;
  posting {} should return 400 with "Invalid enquiry ID" without changing data.
- The taskpane uses a same-origin URL to avoid www/non-www POST redirects.
- After deployment, close and reopen the add-in to load the updated taskpane.

Install:
1. Remove old FAC Status add-ins.
2. Upload this folder to /outlook-addin-v6/.
3. Add manifest-v6.xml as a new custom add-in.
4. Open an enquiry and confirm the pane says FAC Status v6.
5. Click a status and check the Google Sheet.
