/* =========================================================================
   api/send-email.js
   =========================================================================
   Function serverless (Vercel) que envia o email através da API do Brevo.

   A API KEY do Brevo NUNCA aparece no browser — fica guardada em segredo
   como variável de ambiente no painel da Vercel (BREVO_API_KEY).

   O ficheiro script.js (que corre no browser do utilizador) chama este
   endpoint em "/api/send-email" em vez de chamar a Brevo diretamente.
   ========================================================================= */

export default async function handler(req, res) {
  // Só aceita pedidos POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido." });
  }

  const API_KEY      = process.env.BREVO_API_KEY;
  const SENDER_EMAIL  = process.env.BREVO_SENDER_EMAIL;
  const SENDER_NAME   = process.env.BREVO_SENDER_NAME || "Câmara Escura Digital";

  if (!API_KEY || !SENDER_EMAIL) {
    return res.status(500).json({
      message: "Configuração em falta no servidor: define BREVO_API_KEY e BREVO_SENDER_EMAIL nas variáveis de ambiente da Vercel.",
    });
  }

  const { toEmail, message, imageBase64, fileName } = req.body || {};

  // --- Validações básicas no servidor ------------------------------------
  if (!toEmail || typeof toEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ message: "Email de destino inválido." });
  }
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ message: "Imagem em falta." });
  }
  // Limite de segurança: ~7MB em base64 (evita pedidos enormes/abuso)
  if (imageBase64.length > 7_000_000) {
    return res.status(400).json({ message: "Imagem demasiado grande." });
  }

  const mensagem = (message && String(message).trim()) || "Aqui está a tua foto editada!";
  const safeFileName = (fileName && String(fileName).slice(0, 80)) || "foto-editada.jpg";

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:680px;margin:0 auto;padding:24px;">
      <h2 style="color:#d94a10;margin:0 0 12px">📷 Câmara Escura Digital</h2>
      <p style="color:#444;margin:0 0 20px">${escapeHtml(mensagem)}</p>
      <img src="cid:foto_editada" alt="Foto editada"
           style="max-width:100%;border-radius:6px;display:block;">
      <p style="color:#999;font-size:12px;margin:16px 0 0">
        Foto editada com Câmara Escura Digital
      </p>
    </div>`;

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail }],
    subject: "A tua foto editada — Câmara Escura Digital",
    htmlContent: htmlBody,
    attachment: [{ content: imageBase64, name: safeFileName }],
  };

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await brevoRes.json().catch(() => ({}));

    if (!brevoRes.ok) {
      return res.status(brevoRes.status).json({
        message: result.message || "Erro ao enviar email pela Brevo.",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro ao contactar a Brevo:", err);
    return res.status(502).json({ message: "Não foi possível contactar o serviço de email." });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
