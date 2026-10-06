const RESPONSES_SHEET_NAME = 'Form Responses';
const ERROR_SHEET_NAME = 'Form Errors';
const EMAIL_LOG_SHEET_NAME = 'Email Log';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const HOMEDATA_POSTCODE_LOOKUP_URL = 'https://api.homedata.co.uk/address/postcode/';
const DEFAULT_TURNSTILE_ALLOWED_HOSTS = [
  'footandanklecentre.co.uk',
  'www.footandanklecentre.co.uk'
];
const MAX_SHORT_FIELD_LENGTH = 300;
const MAX_LONG_FIELD_LENGTH = 2500;
const MAX_CHAT_ATTACHMENTS = 3;
const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;  

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (String(params.action || '').toLowerCase() === 'addresslookup') {
    return addressLookupResponse_(params);
  }

  return jsonpResponse_({
    ok: false,
    error: 'Unknown action.'
  }, params.callback);
}

function doPost(e) {
  const params = (e && e.parameter) || {};

  if (String(params.action || '').toLowerCase() === 'update-status') {
    try {
      return handleOutlookStatusUpdate_(e);
    } catch (error) {
      Logger.log('Outlook status update failed: ' + error);

      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: error && error.message ? error.message : String(error)
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  const data = normalisePayload_(e);

  try {
    if (data.website) {
      return redirectResponse_(data.redirectUrl);
    }

    verifyTurnstileOrThrow_(data);
    validateSubmissionOrThrow_(data);

    data.enquiryId = generateEnquiryId_();

    const spreadsheet = SpreadsheetApp.openById(getRequiredProperty_('SHEET_ID'));
    const sheet = getOrCreateSheet_(spreadsheet, RESPONSES_SHEET_NAME);
    appendResponseRow_(sheet, data);

    sendNotificationEmail_(data);

    return redirectResponse_(data.redirectUrl);
  } catch (error) {
    logSubmissionError_(data, error, e);
    return rejectedResponse_(error);
  }
}

function addressLookupResponse_(params) {
  const callback = params.callback || '';
  const postcode = String(params.postcode || '').replace(/\s+/g, '').trim().toUpperCase();

  if (!/^[A-Z0-9]{5,8}$/.test(postcode)) {
    return jsonpResponse_({
      ok: false,
      error: 'Enter a valid UK postcode.'
    }, callback);
  }

  const apiKey = getOptionalProperty_('HOMEDATA_API_KEY');
  if (!apiKey) {
    return jsonpResponse_({
      ok: false,
      error: 'Address lookup is not configured.'
    }, callback);
  }

  try {
    const response = UrlFetchApp.fetch(HOMEDATA_POSTCODE_LOOKUP_URL + encodeURIComponent(postcode) + '/', {
      headers: {
        Authorization: 'Api-Key ' + apiKey
      },
      muteHttpExceptions: true
    });
    const status = response.getResponseCode();
    const payload = JSON.parse(response.getContentText() || '{}');

    if (status < 200 || status >= 300) {
      return jsonpResponse_({
        ok: false,
        error: (payload.error && payload.error.message) || 'Address lookup failed.'
      }, callback);
    }

    const addresses = Array.isArray(payload.addresses) ? payload.addresses : [];
    return jsonpResponse_({
      ok: true,
      postcode: payload.postcode || postcode,
      count: payload.count || addresses.length,
      addresses: addresses.map(address => ({
        uprn: address.uprn || '',
        address: address.address || '',
        building_name: address.building_name || '',
        building_number: address.building_number || '',
        street: address.street || '',
        town: address.town || '',
        postcode: payload.postcode || postcode
      }))
    }, callback);
  } catch (error) {
    Logger.log('Address lookup failed: ' + error);
    return jsonpResponse_({
      ok: false,
      error: 'Address lookup failed.'
    }, callback);
  }
}

function handleOutlookStatusUpdate_(e) {
  const params = (e && e.parameter) || {};
  const suppliedSecret = String(params.secret || '');
  const expectedSecret = getRequiredProperty_('OUTLOOK_STATUS_SECRET');

  if (!suppliedSecret || suppliedSecret !== expectedSecret) {
    throw new Error('Unauthorized status update.');
  }

  const enquiryId = String(params.enquiryId || '').trim();
  const requestedStatus = String(params.status || '').trim();

  if (!enquiryId) throw new Error('Missing enquiryId.');
  if (!/^ENQ-[A-Z0-9-]+$/i.test(enquiryId)) throw new Error('Invalid enquiryId.');

  const allowedStatuses = [
    'Dealt With',
    'Email Sent',
    'Message Left',
    'No Reply',
    'To Be Followed Up',
    'Will Think About It'
  ];
  const matchedStatus = allowedStatuses.find(
    status => status.toLowerCase() === requestedStatus.toLowerCase()
  );

  if (!matchedStatus) throw new Error('Invalid status.');

  const spreadsheet = SpreadsheetApp.openById(getRequiredProperty_('SHEET_ID'));
  const sheet = getOrCreateSheet_(spreadsheet, RESPONSES_SHEET_NAME);
  const enquiryIdColumn = findHeaderColumn_(sheet, 'Enquiry ID');
  const statusColumn = getOrCreateHeaderColumn_(sheet, 'Status');

  if (!enquiryIdColumn) throw new Error('Enquiry ID column not found.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('No enquiry rows found.');

  const ids = sheet.getRange(2, enquiryIdColumn, lastRow - 1, 1).getDisplayValues();
  let matchedRow = -1;

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim().toLowerCase() === enquiryId.toLowerCase()) {
      matchedRow = i + 2;
      break;
    }
  }

  if (matchedRow === -1) throw new Error('Enquiry ID not found: ' + enquiryId);

  const currentStatus = String(sheet.getRange(matchedRow, statusColumn).getDisplayValue() || '').trim();
  if (currentStatus !== matchedStatus) {
    sheet.getRange(matchedRow, statusColumn).setValue(matchedStatus);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      enquiryId: enquiryId,
      status: matchedStatus,
      row: matchedRow
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalisePayload_(e) {
  const params = (e && e.parameter) || {};
  const formType = (params.formType || 'contact').toLowerCase();
  return {
    submittedAt: new Date(),
    formType: formType,
    source: params.source || (formType === 'booking' ? 'booking form' : 'contact form'),
    subject: params.subject || 'Website form submission',
    redirectUrl: params.redirectUrl || getScriptProperties_().SITE_SUCCESS_URL || '',
    website: params.website || '',
    pageUrl: params.pageUrl || '',
    turnstileToken: params['cf-turnstile-response'] || '',
    name: params.name || '',
    email: params.email || '',
    phone: params.phone || '',
    existingPatient: params.existingPatient || '',
    message: params.message || '',
    service: params.service || '',
    location: params.location || '',
    date: params.date || '',
    dob: params.dob || '',
    postcode: params.postcode || '',
    addressLine1: params.addressLine1 || '',
    addressLine2: params.addressLine2 || '',
    city: params.city || '',
    notes: params.notes || '',
    photoConsent: params.photoConsent || '',
    consultationRequested: params.consultationRequested || '',
    surgeryType: params.surgeryType || (
      String(params.source || '').trim().toLowerCase() === 'chatbot' &&
      String(params.subject || '').trim().toLowerCase() === 'surgery enquiry from chatbot'
        ? 'Foot surgery'
        : ''
    ),
    attachments: params.attachments || ''
  };
}

function appendResponseRow_(sheet, data) {
  const formLabel = data.formType === 'booking' ? 'Booking' : 'Enquiry';
  const serviceValue = data.formType === 'contact' && hasValue_(data.surgeryType)
    ? data.surgeryType
    : data.service;

  ensureResponseHeader_(sheet);

  sheet.appendRow([
    formatSubmittedAt_(data.submittedAt),
    data.enquiryId,
    formLabel,
    sheetText_(data.name),
    sheetText_(data.email),
    sheetText_(data.phone),
    sheetText_(serviceValue),
    sheetText_(data.location),
    sheetText_(formatBookingDate_(data.date)),
    sheetText_(data.formType === 'booking' ? data.notes : data.message)
  ]);

  const sourceColumn = getOrCreateHeaderColumn_(sheet, 'Source');
  sheet.getRange(sheet.getLastRow(), sourceColumn).setValue(sheetText_(data.source));
}

function ensureResponseHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Submitted At',
      'Enquiry ID',
      'Form Type',
      'Name',
      'Email',
      'Phone',
      'Service',
      'Location',
      'Preferred Date',
      'Message',
      'Source',
      'Status'
    ]);
    sheet.setFrozenRows(1);
  }
}

function sendNotificationEmail_(data) {
  const isBooking = data.formType === 'booking';
  const service = String(data.service || '').trim().toLowerCase();
  const isSurgeryBooking = isBooking && (
    service === 'foot & ankle surgery' || service === 'cosmetic foot surgery'
  );
  const isChatbotSurgeryEnquiry = String(data.source || '').trim().toLowerCase() === 'chatbot' && String(data.subject || '').trim().toLowerCase() === 'surgery enquiry from chatbot';
  const isSurgeryEnquiry = isSurgeryBooking || isChatbotSurgeryEnquiry;
  const notifyEmail = isSurgeryEnquiry
    ? 'smit.christian@footandanklecentre.co.uk'
    : getRequiredProperty_('NOTIFY_EMAIL');
  const ccEmail = isSurgeryEnquiry ? 'enquiries@footandanklecentre.com' : '';
  const loggedRecipients = notifyEmail + (ccEmail ? '; CC: ' + ccEmail : '');
  const rows = [
    ['Enquiry ID', data.enquiryId],
    ['Source', data.source],
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone]
  ];

  if (isBooking) {
    const existingPatient = String(data.existingPatient || '').toLowerCase();
    const patientDetailRows = [
      ['Date of birth', formatBookingDate_(data.dob)],
      ['Address line 1', data.addressLine1],
      ['Address line 2', data.addressLine2],
      ['Town or city', data.city],
      ['Postcode', data.postcode]
    ].filter(([, value]) => hasValue_(value));

    if (hasValue_(data.existingPatient)) {
      rows.push(['Existing patient', data.existingPatient]);
    }

    if (existingPatient === 'no' || patientDetailRows.length) {
      rows.push.apply(rows, patientDetailRows);
    }

    rows.push(['Service', data.service]);
    rows.push(['Location', data.location]);
    rows.push(['Preferred date', formatBookingDate_(data.date)]);
    rows.push(['Details', data.notes]);
  } else {
    if (hasValue_(data.surgeryType)) {
      rows.push(['Surgery type', data.surgeryType]);
    }
    rows.push(['Message', data.message]);
  }

  if (isSurgeryEnquiry) {
    rows.push(['Happy to send photos', String(data.photoConsent || '').toLowerCase() === 'yes' ? 'Yes' : 'No']);
    rows.push(['Free 20-minute consultation requested', String(data.consultationRequested || '').toLowerCase() === 'yes' ? 'Yes' : 'No']);
  }

  const attachmentNames = getAttachmentNames_(data.attachments);
  if (attachmentNames.length) {
    rows.push(['Photo attachments', attachmentNames.join(', ')]);
  }

  const textBody = rows.map(([label, value]) => label + ': ' + (value || '')).join('\n');
  const htmlRows = rows.map(([label, value]) =>
    '<tr>' +
      '<td style="padding:12px 14px;border:1px solid #d8deea;background:#f5f7fb;font-weight:700;width:180px;">' + escapeHtml_(label) + '</td>' +
      '<td style="padding:12px 14px;border:1px solid #d8deea;background:#ffffff;">' + formatEmailValue_(value) + '</td>' +
    '</tr>'
  ).join('');

  const htmlBody = [
    '<div style="font-family:Arial,sans-serif;color:#1b2a41;line-height:1.5;">',
    '<p style="margin:0 0 16px;">New ' + escapeHtml_(isBooking ? 'Booking' : 'Enquiry') + ' received.</p>',
    '<table style="border-collapse:collapse;width:100%;max-width:760px;">',
    '<thead><tr>',
    '<th style="text-align:left;padding:12px 14px;background:#30428f;color:#ffffff;border:1px solid #30428f;">Field</th>',
    '<th style="text-align:left;padding:12px 14px;background:#30428f;color:#ffffff;border:1px solid #30428f;">Value</th>',
    '</tr></thead>',
    '<tbody>',
    htmlRows,
    '</tbody></table>',
    '</div>'
  ].join('');

  const options = { htmlBody: htmlBody };
  const attachments = data.attachments ? buildEmailAttachments_(data.attachments) : [];
  if (attachments.length) options.attachments = attachments;
  if (ccEmail) options.cc = ccEmail;
  if (data.email) options.replyTo = data.email;

  try {
    const emailSubject = data.subject + ' [' + data.enquiryId + ']';
    MailApp.sendEmail(notifyEmail, emailSubject, textBody, options);
    logEmailDispatch_(data, loggedRecipients, 'Sent', '');
  } catch (error) {
    logEmailDispatch_(data, loggedRecipients, 'Failed', error && error.message ? error.message : String(error));
    throw error;
  }
}

function generateEnquiryId_() {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const suffix = Utilities.getUuid().replace(/-/g, '').substring(0, 4).toUpperCase();
  return 'ENQ-' + timestamp + '-' + suffix;
}

function backfillExistingEnquiryIds() {
  const spreadsheet = SpreadsheetApp.openById(getRequiredProperty_('SHEET_ID'));
  const sheet = getOrCreateSheet_(spreadsheet, RESPONSES_SHEET_NAME);
  let enquiryIdColumn = findHeaderColumn_(sheet, 'Enquiry ID');

  if (!enquiryIdColumn) {
    enquiryIdColumn = getOrCreateHeaderColumn_(sheet, 'Enquiry ID');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, enquiryIdColumn, lastRow - 1, 1);
  const values = range.getValues();

  for (let i = 0; i < values.length; i++) {
    if (!String(values[i][0] || '').trim()) {
      values[i][0] = generateEnquiryId_();
    }
  }

  range.setValues(values);
}

function redirectResponse_(url) {
  const safeUrl = url || getScriptProperties_().SITE_SUCCESS_URL || '';
  const fallbackMessage = '<p>Your form has been submitted successfully.</p>';

  if (!safeUrl) {
    return HtmlService.createHtmlOutput(fallbackMessage);
  }

  const html = [
    '<!doctype html>',
    '<html><head>',
    '<meta charset="utf-8">',
    '<meta http-equiv="refresh" content="0; url=' + escapeHtml_(safeUrl) + '">',
    '<script>window.location.replace(' + JSON.stringify(safeUrl) + ');</script>',
    '</head><body>',
    '<p>Redirecting...</p>',
    '</body></html>'
  ].join('');

  return HtmlService.createHtmlOutput(html);
}

function jsonpResponse_(payload, callback) {
  const body = JSON.stringify(payload || {});
  const callbackName = String(callback || '').trim();

  if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(callbackName)) {
    return ContentService
      .createTextOutput(callbackName + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function findHeaderColumn_(sheet, headerName) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];

  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === headerName.toLowerCase()) {
      return i + 1;
    }
  }

  return 0;
}

function getOrCreateHeaderColumn_(sheet, headerName) {
  const existingColumn = findHeaderColumn_(sheet, headerName);
  if (existingColumn) return existingColumn;

  const newColumn = Math.max(sheet.getLastColumn(), 0) + 1;
  sheet.getRange(1, newColumn).setValue(headerName);
  return newColumn;
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function sheetText_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text.trim()) ? "'" + text : text;
}

function hasValue_(value) {
  return String(value || '').trim() !== '';
}

function ensureHeader_(sheet, header) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
}

function getRequiredProperty_(key) {
  const value = getScriptProperties_()[key];
  if (!value) {
    throw new Error('Missing script property: ' + key);
  }
  return value;
}

function getScriptProperties_() {
  return PropertiesService.getScriptProperties().getProperties();
}

function getOptionalProperty_(key) {
  return getScriptProperties_()[key] || '';
}

function shouldEnforceTurnstile_() {
  const value = getOptionalProperty_('TURNSTILE_ENFORCE').toLowerCase();
  return !(value === 'false' || value === '0' || value === 'no' || value === 'off');
}

function getTurnstileSecret_() {
  return getOptionalProperty_('TURNSTILE_SECRET') || getOptionalProperty_('TURNSTILE_SECRET_KEY');
}

function getTurnstileAllowedHosts_() {
  const configuredHosts = getOptionalProperty_('TURNSTILE_ALLOWED_HOSTS');
  const hosts = configuredHosts ? configuredHosts.split(',') : DEFAULT_TURNSTILE_ALLOWED_HOSTS;

  return hosts
    .map(host => String(host || '').trim().toLowerCase())
    .filter(Boolean);
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatEmailValue_(value) {
  const safeValue = escapeHtml_(value || '').replace(/\r?\n/g, '<br>');
  return safeValue || '&nbsp;';
}

function formatSubmittedAt_(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function formatBookingDate_(value) {
  const text = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : text;
}

function verifyTurnstileOrThrow_(data) {
  if (!shouldEnforceTurnstile_()) return;

  const secret = getTurnstileSecret_();
  if (!secret) throw new Error('Missing TURNSTILE_SECRET script property.');
  if (!data.turnstileToken) throw new Error('Missing Turnstile token.');

  const response = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
    method: 'post',
    payload: {
      secret: secret,
      response: data.turnstileToken
    },
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText() || '{}');
  if (!result.success) {
    Logger.log('Turnstile verification failed: ' + JSON.stringify(result));
    throw new Error('Turnstile verification failed: ' + getTurnstileErrorMessage_(result));
  }

  const hostname = String(result.hostname || '').toLowerCase();
  const allowedHosts = getTurnstileAllowedHosts_();
  if (hostname && allowedHosts.length && allowedHosts.indexOf(hostname) === -1) {
    throw new Error('Turnstile hostname rejected: ' + hostname);
  }
}

function getTurnstileErrorMessage_(result) {
  const codes = result && result['error-codes'];
  return codes && codes.length ? codes.join(', ') : 'unknown error';
}

function validateSubmissionOrThrow_(data) {
  const formType = data.formType;
  if (formType !== 'booking' && formType !== 'contact') {
    throw new Error('Invalid form type.');
  }

  requireField_(data.name, 'Name');
  requireField_(data.email, 'Email');
  requireField_(data.phone, 'Phone');

  if (!isValidEmail_(data.email)) {
    throw new Error('Invalid email address.');
  }

  validateFieldLength_(data.name, 'Name', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.email, 'Email', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.phone, 'Phone', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.existingPatient, 'Existing patient', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.service, 'Service', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.location, 'Location', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.date, 'Preferred date', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.dob, 'Date of birth', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.postcode, 'Postcode', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.addressLine1, 'Address line 1', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.addressLine2, 'Address line 2', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.city, 'Town or city', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.surgeryType, 'Surgery type', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.message, 'Message', MAX_LONG_FIELD_LENGTH);
  validateFieldLength_(data.notes, 'Notes', MAX_LONG_FIELD_LENGTH);
  validateFieldLength_(data.photoConsent, 'Photo consent', MAX_SHORT_FIELD_LENGTH);
  validateFieldLength_(data.consultationRequested, 'Consultation request', MAX_SHORT_FIELD_LENGTH);

  validateChatAttachments_(data);

  if (formType === 'booking') {
    requireField_(data.existingPatient, 'Existing patient');
    if (String(data.existingPatient || '').toLowerCase() === 'no') {
      requireField_(data.dob, 'Date of birth');
      requireField_(data.postcode, 'Postcode');
      requireField_(data.addressLine1, 'Address line 1');
      requireField_(data.city, 'Town or city');
    }
    requireField_(data.service, 'Service');
    requireField_(data.location, 'Location');
    const service = String(data.service || '').trim().toLowerCase();
    if (service === 'foot & ankle surgery' || service === 'cosmetic foot surgery') {
      if (!String(data.notes || '').trim()) {
        throw new Error('Please describe your problem to us');
      }
      validateSurgeryPhotoChoice_(data);
    }
  } else {
    requireField_(data.message, 'Message');
    if (String(data.source || '').trim().toLowerCase() === 'chatbot' && String(data.subject || '').trim().toLowerCase() === 'surgery enquiry from chatbot') {
      requireField_(data.surgeryType, 'Surgery type');
      if (!String(data.message || '').trim()) {
        throw new Error('Please describe your problem to us');
      }
      validateSurgeryPhotoChoice_(data);
    }
  }

  rejectSpamContentOrThrow_(data);
}

function validateChatAttachments_(data) {
  const service = String(data.service || '').trim().toLowerCase();
  const isSurgeryBooking = data.formType === 'booking' && (
    service === 'foot & ankle surgery' || service === 'cosmetic foot surgery'
  );
  if (!data.attachments) {
    return;
  }
  if (data.formType !== 'contact' && !isSurgeryBooking) throw new Error('Attachments are only supported for surgery booking requests.');

  let attachments;
  try {
    attachments = JSON.parse(String(data.attachments));
  } catch (error) {
    throw new Error('Invalid attachment data.');
  }

  if (!Array.isArray(attachments) || attachments.length > MAX_CHAT_ATTACHMENTS) {
    throw new Error('You can attach up to 3 photos.');
  }
  let totalBytes = 0;
  attachments.forEach((attachment) => {
    const mime = String(attachment && attachment.type || '').toLowerCase();
    const name = String(attachment && attachment.name || '');
    const encoded = String(attachment && attachment.data || '');
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new Error('Only JPG, PNG or WebP photos can be attached.');
    if (!/^[^\\/]{1,120}\.(?:jpe?g|png|webp)$/i.test(name)) throw new Error('One attachment has an invalid filename.');
    if (!encoded || !/^[A-Za-z0-9+/]+=*$/.test(encoded)) throw new Error('One attachment is invalid.');
    const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
    if (bytes > MAX_CHAT_ATTACHMENT_BYTES) throw new Error('Each photo must be 5 MB or smaller.');
    totalBytes += bytes;
  });
  if (totalBytes > MAX_CHAT_ATTACHMENT_BYTES * MAX_CHAT_ATTACHMENTS) throw new Error('Attachments are too large.');
}

function validateSurgeryPhotoChoice_(data) {
  const photoConsent = String(data.photoConsent || '').trim().toLowerCase() === 'yes';
  const consultationRequested = String(data.consultationRequested || '').trim().toLowerCase() === 'yes';
  if (photoConsent === consultationRequested) {
    throw new Error('Please confirm that you are happy to send photos, or choose the free 20-minute consultation.');
  }
}

function buildEmailAttachments_(rawAttachments) {
  if (!rawAttachments) return [];
  const attachments = JSON.parse(String(rawAttachments));
  return attachments.map((attachment) => Utilities.newBlob(
    Utilities.base64Decode(String(attachment.data)),
    String(attachment.type).toLowerCase(),
    String(attachment.name)
  ));
}

function getAttachmentNames_(rawAttachments) {
  if (!rawAttachments) return [];
  const attachments = JSON.parse(String(rawAttachments));
  return attachments.map(attachment => String(attachment && attachment.name || '')).filter(Boolean);
}

function requireField_(value, label) {
  if (!String(value || '').trim()) {
    throw new Error(label + ' is required.');
  }
}

function validateFieldLength_(value, label, maxLength) {
  if (String(value || '').length > maxLength) {
    throw new Error(label + ' is too long.');
  }
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || '').trim());
}

function rejectSpamContentOrThrow_(data) {
  const allowMessageLinks = isTruthy_(getOptionalProperty_('ALLOW_MESSAGE_LINKS'));
  const freeText = [data.message, data.notes].join(' ');
  const identityText = [data.name, data.email, data.phone].join(' ');

  if (containsUrl_(identityText)) {
    throw new Error('Spam content rejected in identity fields.');
  }

  if (!allowMessageLinks && containsUrl_(freeText)) {
    throw new Error('Spam content rejected: links are not allowed.');
  }

  if (containsKnownSpamPattern_(freeText + ' ' + data.name)) {
    throw new Error('Spam content rejected.');
  }
}

function containsUrl_(value) {
  return /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:ru|cn|xyz|top|click|casino|bet|loan|info|biz|site|online)(?:\/|\b))/i
    .test(String(value || ''));
}

function containsKnownSpamPattern_(value) {
  return /(casino|betting|viagra|levitra|cialis|crypto|forex|loan|porn|seo|backlink)/i
    .test(String(value || ''));
}

function isTruthy_(value) {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function rejectedResponse_(error) {
  const message = error && error.message ? error.message : 'Submission rejected.';
  const html = [
    '<!doctype html>',
    '<html><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Submission not sent</title>',
    '</head><body style="font-family:Arial,sans-serif;line-height:1.5;padding:32px;color:#1b2a41;">',
    '<h1>Submission not sent</h1>',
    '<p>Please go back, complete the spam check, and try again.</p>',
    '<p>If the problem continues, please call the clinic on <a href="tel:+442085244516">0208 524 4516</a>.</p>',
    '<p style="color:#5f6f89;font-size:14px;">Reason: ' + escapeHtml_(message) + '</p>',
    '</body></html>'
  ].join('');

  return HtmlService.createHtmlOutput(html);
}

function logSubmissionError_(data, error, e) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getRequiredProperty_('SHEET_ID'));
    const sheet = getOrCreateSheet_(spreadsheet, ERROR_SHEET_NAME);

    ensureHeader_(sheet, [
      'Date Submitted',
      'Form Type',
      'Name',
      'Email',
      'Error Message',
      'Stack',
      'Payload'
    ]);

    sheet.appendRow([
      formatSubmittedAt_(new Date()),
      data.formType || '',
      data.name || '',
      data.email || '',
      error && error.message ? error.message : String(error),
      error && error.stack ? error.stack : '',
      JSON.stringify((e && e.parameter) || {})
    ]);
  } catch (loggingError) {
    Logger.log('Failed to log submission error: ' + loggingError);
    Logger.log('Original error: ' + error);
  }
}

function logEmailDispatch_(data, recipient, status, details) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getRequiredProperty_('SHEET_ID'));
    const sheet = getOrCreateSheet_(spreadsheet, EMAIL_LOG_SHEET_NAME);

    ensureHeader_(sheet, [
      'Date Submitted',
      'Enquiry ID',
      'Form Type',
      'Name',
      'Email',
      'Recipient',
      'Status',
      'Details'
    ]);

    ensureEmailLogEnquiryIdHeader_(sheet);

    sheet.appendRow([
      formatSubmittedAt_(new Date()),
      data.enquiryId || '',
      data.formType || '',
      data.name || '',
      data.email || '',
      recipient || '',
      status || '',
      details || ''
    ]);
  } catch (loggingError) {
    Logger.log('Failed to log email dispatch: ' + loggingError);
  }
}

function ensureEmailLogEnquiryIdHeader_(sheet) {
  const header = String(sheet.getRange(1, 2).getValue() || '').trim();

  if (header !== 'Enquiry ID') {
    sheet.insertColumnAfter(1);
    sheet.getRange(1, 2).setValue('Enquiry ID');
  }
}

function authorizeExternalRequests() {
  UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
    method: 'post',
    payload: {
      secret: 'test',
      response: 'test'
    },
    muteHttpExceptions: true
  });

  UrlFetchApp.fetch(HOMEDATA_POSTCODE_LOOKUP_URL + 'AL21UE/', {
    headers: {
      Authorization: 'Api-Key test'
    },
    muteHttpExceptions: true
  });
}
