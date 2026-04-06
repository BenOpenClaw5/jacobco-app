import { createServerSupabase } from '@/lib/supabaseServer';

interface ReimbursementPayload {
  amount: number;
  description: string;
  receipt_url: string;
  receipt_storage_path: string;
}

interface SubmitPayload {
  employee_name: string;
  employee_role: string;
  pay_period_start: string;
  pay_period_end: string;
  events_count: number;
  events_description: string;
  shop_hours_type: 'none' | 'workforce' | 'manual';
  shop_hours_manual: number | null;
  shop_hours_note: string;
  general_notes: string;
  reimbursements: ReimbursementPayload[];
}

async function sendPayrollEmail(submission: Record<string, unknown>, reimbursements: ReimbursementPayload[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const periodLabel = `${submission.pay_period_start} to ${submission.pay_period_end}`;
  const reimbTotal = reimbursements.reduce((sum, r) => sum + Number(r.amount), 0);

  const reimbSection = reimbursements.length === 0
    ? '<p style="color:#888;">None</p>'
    : reimbursements.map((r, i) => `
        <div style="border-left:2px solid #334;padding:8px 14px;margin:8px 0;background:#111;">
          <strong>Item ${i + 1}</strong><br/>
          Amount: <strong>$${Number(r.amount).toFixed(2)}</strong><br/>
          ${r.description ? `Description: ${r.description}<br/>` : ''}
          Receipt: <a href="${r.receipt_url}" style="color:#7ab3d4;">${r.receipt_url}</a>
        </div>
      `).join('');

  const shopHoursSection = (() => {
    if (submission.shop_hours_type === 'none') return 'No shop hours worked.';
    if (submission.shop_hours_type === 'manual') return `Manual entry — <strong>${submission.shop_hours_manual} hours</strong>`;
    const note = submission.shop_hours_note ? ` (Note: ${submission.shop_hours_note})` : '';
    return `Using Workforce${note}`;
  })();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#070c0e;font-family:sans-serif;color:#e0e0e0;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="border-bottom:1px solid #1e2e38;padding-bottom:20px;margin-bottom:24px;">
      <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4a6070;margin-bottom:6px;">Jacob Co</div>
      <div style="font-size:22px;font-weight:300;letter-spacing:2px;color:#fff;">Payroll Submission</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:6px 0;color:#6a8090;font-size:12px;width:140px;">Employee</td>
          <td style="padding:6px 0;color:#fff;font-size:14px;">${submission.employee_name}</td></tr>
      <tr><td style="padding:6px 0;color:#6a8090;font-size:12px;">Role</td>
          <td style="padding:6px 0;color:#fff;font-size:14px;">${submission.employee_role}</td></tr>
      <tr><td style="padding:6px 0;color:#6a8090;font-size:12px;">Pay Period</td>
          <td style="padding:6px 0;color:#fff;font-size:14px;">${periodLabel}</td></tr>
      <tr><td style="padding:6px 0;color:#6a8090;font-size:12px;">Submitted</td>
          <td style="padding:6px 0;color:#fff;font-size:14px;">${new Date().toLocaleString('en-US')}</td></tr>
    </table>

    <div style="border-top:1px solid #1e2e38;padding-top:20px;margin-bottom:20px;">
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#4a6070;margin-bottom:12px;">Events Worked</div>
      <p style="margin:0;"><strong>${submission.events_count}</strong> event(s)</p>
      ${submission.events_description ? `<p style="margin:8px 0 0;color:#aaa;">${submission.events_description}</p>` : ''}
    </div>

    <div style="border-top:1px solid #1e2e38;padding-top:20px;margin-bottom:20px;">
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#4a6070;margin-bottom:12px;">Shop Hours</div>
      <p style="margin:0;">${shopHoursSection}</p>
    </div>

    <div style="border-top:1px solid #1e2e38;padding-top:20px;margin-bottom:20px;">
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#4a6070;margin-bottom:12px;">
        Reimbursements${reimbursements.length > 0 ? ` — Total: $${reimbTotal.toFixed(2)}` : ''}
      </div>
      ${reimbSection}
    </div>

    ${submission.general_notes ? `
    <div style="border-top:1px solid #1e2e38;padding-top:20px;margin-bottom:20px;">
      <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#4a6070;margin-bottom:12px;">Employee Notes</div>
      <p style="margin:0;color:#aaa;">${submission.general_notes}</p>
    </div>
    ` : ''}

    <div style="border-top:1px solid #1e2e38;padding-top:16px;margin-top:8px;">
      <p style="font-size:11px;color:#3a5060;margin:0;">Jacob Co Production Board — Payroll Submission</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Jacob Co Payroll <onboarding@resend.dev>',
        to: ['benjamincolemorris@gmail.com'],
        subject: `Payroll Submission — ${submission.employee_name} (${submission.pay_period_start})`,
        html,
      }),
    });
  } catch (err) {
    console.error('Email send failed (non-fatal):', err);
  }
}

export async function POST(request: Request) {
  try {
    const body: SubmitPayload = await request.json();

    // Validate required fields
    if (!body.employee_name?.trim() || !body.employee_role || !body.pay_period_start || !body.pay_period_end) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Insert submission
    const { data: sub, error: subErr } = await supabase
      .from('payroll_submissions')
      .insert({
        employee_name: body.employee_name.trim(),
        employee_role: body.employee_role,
        pay_period_start: body.pay_period_start,
        pay_period_end: body.pay_period_end,
        events_count: body.events_count ?? 0,
        events_description: body.events_description?.trim() || null,
        shop_hours_type: body.shop_hours_type ?? 'none',
        shop_hours_manual: body.shop_hours_manual ?? null,
        shop_hours_note: body.shop_hours_note?.trim() || null,
        general_notes: body.general_notes?.trim() || null,
        status: 'submitted',
      })
      .select()
      .single();

    if (subErr) throw subErr;

    // Insert reimbursements
    if (body.reimbursements?.length > 0) {
      const { error: reimbErr } = await supabase
        .from('payroll_reimbursements')
        .insert(
          body.reimbursements.map(r => ({
            submission_id: sub.id,
            amount: r.amount,
            description: r.description?.trim() || null,
            receipt_url: r.receipt_url,
            receipt_storage_path: r.receipt_storage_path,
          }))
        );
      if (reimbErr) console.error('Reimbursement insert error (non-fatal):', reimbErr);
    }

    // Send email (non-blocking)
    sendPayrollEmail(sub as Record<string, unknown>, body.reimbursements ?? []).catch(console.error);

    return Response.json({ ok: true, id: sub.id });
  } catch (err) {
    console.error('Payroll submit error:', err);
    return Response.json({ error: 'Submission failed' }, { status: 500 });
  }
}
