import { NextResponse } from 'next/server';

// In-memory product storage for demo purposes
// In a real app, this would be a database
let products = [
  { id: '1', name: 'Coca-Cola 350ml', price: 5.50, cost: 2.50, stock: 50, minStock: 10, maxStock: 100, category: 'Bebidas', sku: '789123456001', image: 'https://picsum.photos/seed/coke/200' },
  { id: '2', name: 'Água Mineral 500ml', price: 3.00, cost: 1.00, stock: 100, minStock: 20, maxStock: 200, category: 'Bebidas', sku: '789123456002', image: 'https://picsum.photos/seed/water/200' },
  { id: '3', name: 'Chocolate Barra 90g', price: 7.90, cost: 4.00, stock: 30, minStock: 5, maxStock: 50, category: 'Doces', sku: '789123456003', image: 'https://picsum.photos/seed/chocolate/200' },
  { id: '4', name: 'Batata Chips 150g', price: 12.50, cost: 6.00, stock: 40, minStock: 10, maxStock: 80, category: 'Salgados', sku: '789123456004', image: 'https://picsum.photos/seed/chips/200' },
  { id: '5', name: 'Suco de Laranja 1L', price: 15.00, cost: 8.00, stock: 25, minStock: 5, maxStock: 40, category: 'Bebidas', sku: '789123456005', image: 'https://picsum.photos/seed/orange/200' },
  { id: '6', name: 'Café Espresso', price: 4.50, cost: 1.50, stock: 200, minStock: 50, maxStock: 500, category: 'Bebidas', sku: '789123456006', image: 'https://picsum.photos/seed/coffee/200' },
  { id: '7', name: 'Pão de Queijo Un.', price: 2.50, cost: 0.80, stock: 150, minStock: 30, maxStock: 300, category: 'Salgados', sku: '789123456007', image: 'https://picsum.photos/seed/cheese/200' },
  { id: '8', name: 'Sanduíche Natural', price: 18.90, cost: 9.00, stock: 20, minStock: 5, maxStock: 30, category: 'Lanches', sku: '789123456008', image: 'https://picsum.photos/seed/sandwich/200' },
];

export async function GET() {
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const product = await req.json();
  const newProduct = {
    ...product,
    id: Math.random().toString(36).substr(2, 9),
    price: Number(product.price),
    cost: Number(product.cost || 0),
    stock: Number(product.stock || 0),
    minStock: Number(product.minStock || 0),
    maxStock: Number(product.maxStock || 0),
  };
  products.push(newProduct);
  return NextResponse.json(newProduct);
}

export async function PUT(req: Request) {
  const product = await req.json();
  products = products.map(p => p.id === product.id ? { 
    ...product, 
    price: Number(product.price),
    cost: Number(product.cost || 0),
    stock: Number(product.stock || 0),
    minStock: Number(product.minStock || 0),
    maxStock: Number(product.maxStock || 0),
  } : p);
  return NextResponse.json(product);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID não fornecido' }, { status: 400 });
  }

  console.log('Tentando excluir produto com ID:', id);
  const initialCount = products.length;
  
  // Garantir que a comparação seja entre strings e remover possíveis espaços
  const targetId = id.trim();
  products = products.filter(p => String(p.id).trim() !== targetId);
  
  const finalCount = products.length;
  const deleted = initialCount > finalCount;
  
  console.log(`Produtos antes: ${initialCount}, Produtos depois: ${finalCount}, Excluído: ${deleted}`);
  
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Produto não encontrado no servidor' }, { status: 404 });
  }

  return NextResponse.json({ success: true, deleted: true });
}
