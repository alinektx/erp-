import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const { items, totalAmount, paymentMethod } = await req.json();

    // 1. Criar a venda
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([{
        total_amount: totalAmount,
        payment_method: paymentMethod,
        status: 'completed'
      }])
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Criar os itens da venda
    const saleItems = items.map((item: any) => ({
      sale_id: sale.id,
      product_id: item.id,
      quantity: item.quantity,
      price_at_sale: item.price
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // 3. Atualizar estoque dos produtos
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.id)
        .single();

      if (product) {
        await supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.id);
      }
    }

    return NextResponse.json({ success: true, saleId: sale.id });
  } catch (error: any) {
    console.error('Error processing sale:', error);
    return NextResponse.json({ error: error.message || 'Erro de configuração do banco de dados' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          products (name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro de configuração do banco de dados' }, { status: 500 });
  }
}
