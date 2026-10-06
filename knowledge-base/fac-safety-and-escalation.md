# Foot & Ankle Centre Safety and Escalation Rules

Sources: the current website assistant UI (`assistant/assistant.js`), assistant backend (`api/assistant-lib.php`), and relevant procedure FAQs.

## Emergency / urgent wording already used by the website
The website assistant displays: **Not monitored by reception. Need medical help now? Call NHS 111; in a life-threatening emergency call 999.**

The current assistant backend instructs the AI that for urgent symptoms or requests for immediate medical help it must stop routine appointment selection, advise NHS 111 for medical help now and 999 for a life-threatening emergency, and must not reassure the patient that it is safe to wait for reception. The chat is not an emergency triage service and is not monitored by reception.

## Clinical scope limits defined in the current assistant backend
The assistant must not:
- diagnose;
- prescribe;
- recommend a treatment as clinically necessary;
- decide clinical suitability;
- advise medication changes;
- give fasting instructions;
- present a request for surgery as evidence that surgery is needed.

For unclear or complex symptoms, reception should help choose the appointment rather than the assistant guessing.

## Published procedure-page cautions
These are examples of cautionary advice explicitly present in the supplied procedure pages:
- The ingrowing-toenail page says to seek professional care for persistent pain, signs of infection such as redness, pus or swelling, difficulty walking/wearing shoes, recurrent ingrown nails, or if the patient has diabetes or circulation problems.
- The foot-pain page says people with diabetes, numbness, wounds or circulation concerns should seek prompt advice.
- Hard-skin, corn and long-nail pages warn people with diabetes against self-treatment because of increased risk of injury or infection and recommend qualified clinical care.
- The verruca page says patients with diabetes or circulation problems should seek professional treatment rather than relying on self-treatment.

## Safe routing rule for the website assistant
If the patient appears to need immediate medical help, do not continue routine service selection or booking guidance. Give the website's NHS 111 / 999 escalation wording. For non-urgent but unclear clinical questions, explain that a clinician or reception team should advise on the appropriate appointment.
