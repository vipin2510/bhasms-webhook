const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const body = req.body;

    const userNumber = body.from || body.mobile || body.sender || null;
    const selectedOption = body.message || body.option || body.text || null;
    const referenceValue = body.reference || body.ref || body.complaint_id || null;
    const documentUrl = body.document_url || body.media_url || null;

    if (!userNumber || !selectedOption) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    /* ================== LOG WEBHOOK ================== */
    await supabase.from('webhook_logs').insert([{
      provider: 'BHASH',
      payload: body
    }]);

    /* ================== REGISTER COMPLAINT ================== */
    if (/register/i.test(selectedOption)) {
      const complaintId = 'CMP' + Date.now();

      await supabase.from('complaints').insert([{
        complaint_id: complaintId,
        user_number: userNumber,
        selected_option: selectedOption,
        reference_value: referenceValue,
        reference_document_url: documentUrl,
        status: 'RECEIVED',
        source: 'BHASH'
      }]);

      return res.status(200).json({
        reply: `✅ Complaint registered successfully.\n🆔 Complaint ID: ${complaintId}`
      });
    }

    /* ================== VIEW STATUS ================== */
    if (/status/i.test(selectedOption)) {
      if (!referenceValue) {
        return res.json({
          reply: '❗ Please provide your Complaint ID.'
        });
      }

      const { data } = await supabase
        .from('complaints')
        .select('status')
        .eq('complaint_id', referenceValue)
        .single();

      if (!data) {
        return res.json({
          reply: '❌ Complaint ID not found.'
        });
      }

      return res.json({
        reply: `📌 Complaint Status: ${data.status}`
      });
    }

    /* ================== FEEDBACK ================== */
    if (/feedback/i.test(selectedOption)) {
      await supabase.from('feedback').insert([{
        user_number: userNumber,
        feedback: referenceValue || 'Feedback received',
        source: 'BHASH'
      }]);

      return res.json({
        reply: '🙏 Thank you for your feedback.'
      });
    }

    /* ================== UNKNOWN OPTION ================== */
    return res.json({
      reply:
        'Welcome to Police Support System 🚔\n\n' +
        'Reply with:\n' +
        '1️⃣ Register Complaint\n' +
        '2️⃣ View Status\n' +
        '3️⃣ Feedback'
    });

  } catch (error) {
    console.error('BHASH Webhook Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};