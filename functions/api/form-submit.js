export async function onRequestPost({ request, env }) {
  try {
    const body = snakeToCamel(await request.json());

    let name = cleanInput(body.name);
    let email = cleanInput(body.email);
    let message = cleanInput(body.message);
    let inquiryType = cleanInput(body.inquiryType);

    if (!name || !email || !message || !inquiryType) {
      return Response.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (message.length > 3000) {
      return Response.json({ ok: false, error: "Message too long" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const lines = [`Name: ${name}`, `Email: ${email}`];
    if (inquiryType) lines.push(`Inquiry Type: ${inquiryType}`);
    lines.push("", message);
    const emailBody = lines.join("\n");

    const sendToEmail = env.FORM_SUBMIT_TO_EMAIL || "mark@appinfra.ai";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "AppInfra Website <no-reply@mail.appinfra.ai>",
        to: [sendToEmail],
        reply_to: email,
        subject: `New Submission from ${name}`,
        text: emailBody
      })
    });

    if (!resendRes.ok) {
      return Response.json(
        { ok: false, error: "Email failed to send" },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

function cleanInput(str) {
  return String(str || "")
    .trim()
    .replace(/\s+/g, " "); // collapse multiple spaces
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function snakeToCamel(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = value;
  }
  return out;
}
