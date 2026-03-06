import { MercadoPagoConfig, Payment } from 'mercadopago';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, description, email } = await req.json();

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'MERCADO_PAGO_ACCESS_TOKEN is not configured' }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    const body = {
      transaction_amount: Number(amount),
      description: description || 'Venda PDV Nexus ERP',
      payment_method_id: 'pix',
      payer: {
        email: email || 'cliente@nexus-erp.com',
      },
    };

    const response = await payment.create({ body });

    return NextResponse.json({
      id: response.id,
      status: response.status,
      qr_code: response.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
    });
  } catch (error: any) {
    console.error('Mercado Pago Error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: error.api_response?.content || error
    }, { status: 500 });
  }
}
