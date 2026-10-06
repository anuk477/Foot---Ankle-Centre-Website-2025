# Foot & Ankle Centre assistant — AWS backend setup

The browser assistant now calls the AWS API Gateway/Lambda backend directly.

API endpoint:

`https://ckg04u58w5.execute-api.eu-west-2.amazonaws.com/default/fac-chatbot-backend`

## Frontend files

Upload the contents of the `assistant/` folder as before:

- `assistant/assistant.js`
- `assistant/assistant.css`
- `assistant/knowledge.json`

The old PHP assistant backend is no longer used. You can remove these old files from the public website once the AWS version is confirmed working:

- `api/assistant.php`
- `api/assistant-lib.php`
- the assistant-specific rules in `api/.htaccess` if they are not used by anything else

Do not put the OpenAI API key in HTML, JavaScript, PHP, or any public website file. The key remains in AWS Secrets Manager and is read only by Lambda.

## Local testing

The frontend works on Live Server at `http://localhost:5500` as long as API Gateway CORS allows that origin.

API Gateway should allow:

- Origin: `http://localhost:5500`
- Methods: `POST`, `OPTIONS`
- Header: `Content-Type`

The deployed Lambda uses OpenAI file search with the production vector store. When adding a
new Markdown knowledge document, upload it to OpenAI with purpose `assistants` and attach the
resulting file to that same vector store. Uploading a file to Storage alone does not make it
available to the Lambda.

The frontend sends JSON in this form:

```json
{"message":"What services do you offer?"}
```

and expects Lambda to return:

```json
{"reply":"..."}
```

## Production

Before going live, add these origins to API Gateway CORS as needed:

- `https://www.footandanklecentre.co.uk`
- `https://footandanklecentre.co.uk`

The Lambda should remain the only component that accesses AWS Secrets Manager and OpenAI.
