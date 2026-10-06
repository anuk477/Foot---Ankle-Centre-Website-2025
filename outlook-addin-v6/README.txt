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

Before upload:
- status-proxy.php must contain the correct OUTLOOK_STATUS_SECRET.

Install:
1. Remove old FAC Status add-ins.
2. Upload this folder to /outlook-addin-v6/.
3. Add manifest-v6.xml as a new custom add-in.
4. Open an enquiry and confirm the pane says FAC Status v6.
5. Click a status and check the Google Sheet.
