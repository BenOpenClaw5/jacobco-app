export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expected = process.env.PAYROLL_ADMIN_PASSWORD ?? 'jacobco2026';
    if (body.password === expected) {
      return Response.json({ ok: true });
    }
    return Response.json({ ok: false, error: 'Invalid password' }, { status: 401 });
  } catch {
    return Response.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}
