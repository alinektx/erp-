import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map snake_case to camelCase for the frontend
    const products = data.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      minStock: p.min_stock,
      maxStock: p.max_stock,
      category: p.category,
      sku: p.sku,
      image: p.image
    }));

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro de configuração do banco de dados' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const product = await req.json();
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: product.name,
        price: Number(product.price),
        cost: Number(product.cost || 0),
        stock: Number(product.stock || 0),
        min_stock: Number(product.minStock || 0),
        max_stock: Number(product.maxStock || 0),
        category: product.category,
        sku: product.sku,
        image: product.image
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedPost = {
      id: data.id,
      name: data.name,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.min_stock,
      maxStock: data.max_stock,
      category: data.category,
      sku: data.sku,
      image: data.image
    };

    return NextResponse.json(formattedPost);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro de configuração do banco de dados' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = getSupabase();
    const product = await req.json();
    
    const { data, error } = await supabase
      .from('products')
      .update({
        name: product.name,
        price: Number(product.price),
        cost: Number(product.cost || 0),
        stock: Number(product.stock || 0),
        min_stock: Number(product.minStock || 0),
        max_stock: Number(product.maxStock || 0),
        category: product.category,
        sku: product.sku,
        image: product.image
      })
      .eq('id', product.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedPut = {
      id: data.id,
      name: data.name,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.min_stock,
      maxStock: data.max_stock,
      category: data.category,
      sku: data.sku,
      image: data.image
    };

    return NextResponse.json(formattedPut);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro de configuração do banco de dados' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID não fornecido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro de configuração do banco de dados' }, { status: 500 });
  }
}
