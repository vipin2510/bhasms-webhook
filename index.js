const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  /* ================= CORS ================= */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    /* ================= INPUT (OPTION 2) ================= */
    let from, message, fromname;

    if (req.method === 'POST' || req.method === 'GET') {
      from =
        req.body?.from ||
        req.query?.fromphone ||
        req.query?.from ||
        null;

      message =
        req.body?.message ||
        req.query?.message ||
        null;

      fromname =
        req.body?.fromname ||
        req.query?.fromname ||
        null;
    }

    /* ================= VALIDATION ================= */
    if (!from || !message) {
      return res.status(400).json({
        error: 'fromphone and message are required'
      });
    }

    /* ================= AUTO CATEGORY ================= */
    let category = 'general';

    if (/register|complaint|report/i.test(message)) {
      category = 'register';
    } else if (/status|track/i.test(message)) {
      category = 'status';
    } else if (/feedback|suggest/i.test(message)) {
      category = 'feedback';
    }

    /* ================= INSERT ================= */
    const { error } = await supabase
      .from('complaints')
      .insert([{
        phone: from,
        from_name: fromname,
        message: message,
        category: category,
        source: 'BHASH'
      }]);

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: 'DB insert failed' });
    }

    /* ================= BOT REPLY ================= */
    return res.status(200).json({
      reply:
        '🚔 Police Support System\n\n' +
        'Your message has been received successfully.\n\n' +
        'You can reply with:\n' +
        '1️⃣ Register Complaint\n' +
        '2️⃣ Check Status <Complaint ID>\n' +
        '3️⃣ Feedback <your message>'
    });

  } catch (err) {
    console.error('Webhook Fatal Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
