const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { from, message, fromname } = req.body;

    if (!from || !message) {
      return res.status(400).json({
        error: 'Payload must contain from and message'
      });
    }

    /* ========= AUTO CATEGORISATION (BASIC) ========= */
    let category = 'general';

    if (/register|complaint|report/i.test(message)) category = 'register';
    else if (/status|track/i.test(message)) category = 'status';
    else if (/feedback|suggest/i.test(message)) category = 'feedback';

    /* ========= SAVE EVERYTHING ========= */
    await supabase.from('complaints').insert([{
      phone: from,
      from_name: fromname || null,
      message,
      category,
      source: 'BHASH'
    }]);

    /* ========= GENERIC BOT RESPONSE ========= */
    return res.status(200).json({
      reply:
        '🚔 Police Support System\n\n' +
        'Your message has been received.\n\n' +
        'You can type:\n' +
        '• Register Complaint\n' +
        '• Check Status <Complaint ID>\n' +
        '• Feedback <your message>'
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
