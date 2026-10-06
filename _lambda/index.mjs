import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({
  region: "eu-west-2"
});

let cachedOpenAIKey;
let cachedTurnstileSecret;

async function getOpenAIKey() {
  if (cachedOpenAIKey) return cachedOpenAIKey;

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: "fac/openai/api-key"
    })
  );

  const secret = JSON.parse(response.SecretString);

  cachedOpenAIKey = secret.OPENAI_API_KEY;

  return cachedOpenAIKey;
}

async function getTurnstileSecret() {
  if (cachedTurnstileSecret) return cachedTurnstileSecret;

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: "fac/cloudflare/turnstile-secret"
    })
  );

  const secret = JSON.parse(response.SecretString);

  cachedTurnstileSecret = secret.TURNSTILE_SECRET_KEY;

  return cachedTurnstileSecret;
}

async function verifyTurnstile(token, remoteIp) {
  const turnstileSecret = await getTurnstileSecret();

  const formData = new URLSearchParams();
  formData.append("secret", turnstileSecret);
  formData.append("response", token);

  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    }
  );

  const result = await response.json();

  if (!result.success) {
    console.warn("Turnstile verification failed:", result);
  }

  return result.success === true;
}

export const handler = async (event) => {
  try {
    const origin =
      event.headers?.origin ||
      event.headers?.Origin ||
      "";

    // Handle browser CORS preflight requests
    if (event.requestContext?.http?.method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders(origin),
        body: ""
      };
    }

    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body;

    const message = body?.message?.trim();
    const turnstileToken = body?.turnstileToken?.trim();

    if (!message) {
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: "Message is required."
        })
      };
    }

    if (!turnstileToken) {
      return {
        statusCode: 403,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: "Turnstile verification is required."
        })
      };
    }

    const remoteIp =
      event.requestContext?.http?.sourceIp ||
      null;

    const turnstileValid = await verifyTurnstile(
      turnstileToken,
      remoteIp
    );

    if (!turnstileValid) {
      return {
        statusCode: 403,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: "Turnstile verification failed."
        })
      };
    }

    // Only call OpenAI after Turnstile has passed
    const apiKey = await getOpenAIKey();

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.6-terra",

          reasoning: {
            effort: "medium"
          },

          tools: [
            {
              type: "file_search",
              vector_store_ids: [
                "vs_6aa96ccf84f08191a3637ca53e497293"
              ]
            }
          ],

          input: [
            {
              role: "system",
              content:
                "You are the website assistant for Foot & Ankle Centre. Use the approved Foot & Ankle Centre knowledge base to answer questions about services, procedures, prices, locations, opening hours, appointments, the team and other clinic information. Read the user's whole message for intent rather than requiring one exact clinical keyword. Treat a request as a surgery quotation enquiry when the user is asking what surgery, an operation, a procedure, correction or treatment might cost, including wording such as asking for a quote if they can send photographs. Recognise descriptions such as joined toes, partially joined toes, toes joined by skin, webbed toes, fused toes or syndactyly as potentially relating to webbed toe separation, while making clear that only clinical assessment can confirm suitability and the final price. Prefer information from the knowledge base over assumptions. If the knowledge base does not contain the answer, say that you do not have enough information rather than inventing details. Do not diagnose medical conditions or provide emergency medical advice. For surgery quotation enquiries, explain clearly that the team can provide an initial quotation based on clear photographs, ask the patient to use the enquiry form or contact reception with the photographs and procedure they are considering, and explain that the clinical team will review the images and confirm the quotation or next steps. When the user asks which appointment is suitable, or when you recommend a specific appointment category based on their symptoms or needs, explain the recommendation and finish the response with: \"Would you like to book an appointment?\" Do not add that question to unrelated general information answers or when the user has already asked to book."
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return {
        statusCode: 500,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          error: "Unable to generate a response."
        })
      };
    }

    const reply = ensureBookingPrompt(
      data.output
        ?.flatMap((item) => item.content || [])
        ?.find((item) => item.type === "output_text")
        ?.text ||
      "Sorry, I couldn't generate a response."
    );

    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        reply
      })
    };
  } catch (error) {
    console.error("Lambda error:", error);

    return {
      statusCode: 500,
      headers: corsHeaders(""),
      body: JSON.stringify({
        error: "Internal server error."
      })
    };
  }
};


function ensureBookingPrompt(reply) {
  const text = String(reply || "").trim();

  const bookingRelevant = /\b(?:appointments?|book(?:ing)?|treatment|assessment|consultation|therapy|surgery|procedure|pricing|prices?|reception|clinic)\b/i.test(text);

  if (!bookingRelevant) return text;
  if (/would you like to book an appointment\??/i.test(text)) return text;

  return `${text}\n\nWould you like to book an appointment?`;
}

function corsHeaders(origin) {
  const allowedOrigins = [
    "http://localhost:5500",
    "https://www.footandanklecentre.co.uk",
    "https://footandanklecentre.co.uk"
  ];

  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : "https://www.footandanklecentre.co.uk";

  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
}
