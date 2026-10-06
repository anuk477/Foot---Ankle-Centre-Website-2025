# Foot & Ankle Centre Booking and Assistant Policy

Sources: `booking.html`, `assistant/knowledge.json`, `api/assistant-lib.php`, and the website assistant UI.

## Appointment request process
- The website booking form is a **request an appointment** form.
- Patients provide preferences and reception contacts them to confirm the date and time.
- Submitting the form does **not** book or reserve an appointment.
- Preferred dates and times are preferences only and may be left blank if the patient is flexible.

## Booking form appointment categories
- Foot & Ankle Surgery
- Cosmetic Foot Surgery
- Podiatry Appointment
- Chiropody Appointment (Routine Care)
- Musculoskeletal Health
- Physiotherapy
- Not sure — please advise

## Booking form locations
- Chingford
- Wanstead
- Westcliff-on-Sea

## Assistant limitations already defined in the website backend
- There are no live slots or diary access in the current assistant implementation.
- The assistant must not claim to have booked, reserved, cancelled or changed an appointment.
- The assistant must direct the patient to the request form for contact details and preferences.
- Reception must confirm the appointment date and time.
- Missing cancellation policy, opening hours, uncertain preparation or other unpublished facts must be confirmed by reception.
- Preparation depends on the appointment. Reception should confirm what to bring and any appointment-specific instructions.
- The assistant must not advise medication changes or fasting arrangements.

## Privacy behaviour defined for the chat
The current assistant backend says not to collect names, contact details, date of birth, full medical histories, insurance numbers or photographs in chat. Contact details and preferences should be entered in the booking/request form instead.

## Reception
Phone: **020 8524 4516**.
