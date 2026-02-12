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
    /* ================= DEBUG LOGGING ================= */
    console.log('=== INCOMING REQUEST ===');
    console.log('Method:', req.method);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    console.log('========================');

    /* ================= INPUT - Handle ALL variations ================= */
    const from = 
      req.body?.from || 
      req.body?.fromphone || 
      req.query?.from || 
      req.query?.fromphone || 
      null;

    const message = 
      req.body?.message || 
      req.query?.message || 
      null;

    const fromname = 
      req.body?.fromname || 
      req.query?.fromname || 
      null;

    /* ================= VALIDATION ================= */
    if (!from || !message) {
      console.error('Validation failed:', { from, message, fromname });
      return res.status(400).json({
        error: 'fromphone and message are required',
        received: { from, message, fromname }
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
    const insertData = {
      phone: from,
      from_name: fromname,
      message: message,
      category: category,
      source: 'BHASH'
    };

    console.log('Inserting to Supabase:', insertData);

    const { data, error } = await supabase
      .from('complaints')
      .insert([insertData])
      .select(); // Add .select() to get the inserted data back

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ 
        error: 'DB insert failed',
        details: error.message 
      });
    }

    console.log('Successfully inserted:', data);

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
    return res.status(500).json({ 
      error: 'Server error',
      message: err.message 
    });
  }
};
