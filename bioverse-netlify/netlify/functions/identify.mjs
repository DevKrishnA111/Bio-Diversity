
const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (statusCode, data) => ({
  statusCode,
  headers: HEADERS,
  body: JSON.stringify(data),
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  const API_KEY = process.env.OPENROUTER_API_KEY;

  if (!API_KEY) {
    return response(500, {
      error: "OpenRouter API key is missing."
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const image = body.image;

    // Validate uploaded images
    if (
      typeof image !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)
    ) {
      return response(400, {
        error: "Please upload a valid JPG, PNG or WEBP image."
      });
    }

    // Keep image payload within a safe size
    if (image.length > 4_800_000) {
      return response(413, {
        error: "Image is too large. Please upload an image under 3.5 MB."
      });
    }

    const MODEL =
      process.env.OPENROUTER_MODEL ||
      "openrouter/free";

    const prompt = `
You are BIOVERSE AI, a biodiversity identification assistant.

Analyze the uploaded photograph and identify the visible
plant, animal, bird, insect, or other organism.

Return ONLY valid JSON in this format:

{
  "commonName": "Common name or null",
  "scientificName": "Scientific name or null",
  "confidence": 0,
  "category": "Mammal, Bird, Plant, Reptile, etc.",
  "habitat": "Known habitat or unknown",
  "description": "Short description",
  "reasoning": "Visible features supporting identification",
  "notes": "Uncertainty or verification advice",
  "candidates": [
    {
      "name": "Alternative common name",
      "scientificName": "Alternative scientific name"
    }
  ]
}

IMPORTANT:
- Never invent a species identification.
- Confidence must be between 0 and 100.
- Provide up to 3 alternative candidates.
- Return null when identification is uncertain.
- Never claim an IUCN conservation status without verification.
- Do not infer the exact location from the photograph.
- Mention when expert verification is necessary.
`;

    const apiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bioverse.netlify.app",
          "X-Title": "BIOVERSE"
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          max_tokens: 1200,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const result = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("OpenRouter error:", result.error);

      return response(502, {
        error: result.error?.message ||
          "AI identification service failed."
      });
    }

    let content = result.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
      content = content
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n");
    }

    if (!content) {
      return response(502, {
        error: "The AI returned an empty response."
      });
    }

    // Extract JSON, including when model adds code fences
    const cleaned = String(content)
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      return response(502, {
        error: "Could not read the AI identification result."
      });
    }

    let identification;

    try {
      identification = JSON.parse(
        cleaned.slice(start, end + 1)
      );
    } catch {
      return response(502, {
        error: "AI returned an invalid identification result."
      });
    }

    return response(200, identification);

  } catch (error) {
    console.error("BIOVERSE identification error:", error);

    return response(500, {
      error: "Something went wrong during identification."
    });
  }
}
