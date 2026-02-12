const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "kanker_police_bot_123";

module.exports = async function handler(req, res) {

  /* ================= CORS ================= */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  /* ================= META WEBHOOK VERIFY ================= */
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ Verification failed');
      return res.status(403).send('Forbidden');
    }
  }

  /* ================= HANDLE INCOMING MESSAGE ================= */
  if (req.method === 'POST') {
    try {
      console.log('📩 Incoming Webhook:', JSON.stringify(req.body, null, 2));

      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messageObj = value?.messages?.[0];

      if (!messageObj) {
        return res.status(200).json({ status: 'no_message' });
      }

      const from = messageObj.from;
      const type = messageObj.type;
      let message = null;
      let media_id = null;

      if (type === 'text') {
        message = messageObj.text.body;
      }

      if (type === 'image') {
        message = '[IMAGE RECEIVED]';
        media_id = messageObj.image.id;
      }

      /* ================= AUTO CATEGORY ================= */
      let category = 'general';
      if (/register|complaint|report/i.test(message)) category = 'register';
      else if (/status|track/i.test(message)) category = 'status';
      else if (/feedback|suggest/i.test(message)) category = 'feedback';

      /* ================= INSERT TO DB ================= */
      const insertData = {
        phone: from,
        message: message,
        media_id: media_id,
        category: category,
        source: 'WhatsApp'
      };

      const { error } = await supabase
        .from('complaints')
        .insert([insertData]);

      if (error) {
        console.error('❌ Supabase Error:', error);
      }

      /* ================= SEND AUTO REPLY ================= */
      await sendWhatsAppMessage(
        from,
        '🚔 *Kanker Police Assistance*\n\n' +
        'Your message has been received.\n\n' +
        'Reply with:\n' +
        '1️⃣ Register Complaint\n' +
        '2️⃣ Track Complaint\n' +
        '3️⃣ Feedback'
      );

      return res.status(200).json({ status: 'ok' });

    } catch (err) {
      console.error('🔥 Webhook Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).send('Method Not Allowed');
};

/* ================= SEND MESSAGE FUNCTION ================= */

async function sendWhatsAppMessage(to, text) {
  const url = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });

  const data = await response.json();
  console.log('📤 WhatsApp API Response:', data);
}
