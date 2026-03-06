'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  ArrowLeft,
  LayoutDashboard,
  Package,
  MoreVertical,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  category: string;
  sku: string;
  image: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    maxStock: '',
    category: '',
    sku: '',
    image: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        cost: (product.cost || 0).toString(),
        stock: (product.stock || 0).toString(),
        minStock: (product.minStock || 0).toString(),
        maxStock: (product.maxStock || 0).toString(),
        category: product.category,
        sku: product.sku,
        image: product.image
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        cost: '',
        stock: '',
        minStock: '',
        maxStock: '',
        category: '',
        sku: '',
        image: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingProduct ? 'PUT' : 'POST';
    const body = editingProduct ? { ...formData, id: editingProduct.id } : formData;

    try {
      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        fetchProducts();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Solicitando exclusão do produto ID:', id);
    
    if (!id) {
      alert('Erro: ID do produto não encontrado.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        const res = await fetch(`/api/products?id=${id}`, { 
          method: 'DELETE',
          headers: { 'Accept': 'application/json' }
        });
        
        const data = await res.json();
        console.log('Resultado da exclusão no servidor:', data);
        
        if (res.ok && data.success) {
          // Atualiza a lista local removendo o produto imediatamente para feedback instantâneo
          setProducts(prev => prev.filter(p => p.id !== id));
          console.log('Produto removido da lista local.');
        } else {
          alert('Erro ao excluir: ' + (data.error || 'O servidor não permitiu a exclusão.'));
        }
      } catch (error) {
        console.error('Falha na requisição de exclusão:', error);
        alert('Erro de rede: Não foi possível se comunicar com o servidor.');
      }
    }
  };

  const margin = useMemo(() => {
    const p = parseFloat(formData.price) || 0;
    const c = parseFloat(formData.cost) || 0;
    if (p <= 0) return 0;
    return ((p - c) / p) * 100;
  }, [formData.price, formData.cost]);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-6 w-px bg-zinc-200" />
          <button 
            onClick={() => handleOpenModal()}
            className="h-10 px-4 bg-zinc-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-sm"
          >
            <Plus size={18} />
            Novo Produto
          </button>
          <div className="h-6 w-px bg-zinc-200" />
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 text-white p-2 rounded-lg">
              <Package size={20} />
            </div>
            <h1 className="text-sm font-bold tracking-tight uppercase">Produtos</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar produtos..."
              className="w-full h-10 pl-10 pr-4 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-200 focus:ring-0 rounded-xl text-sm transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">Carregando catálogo...</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={product.id}
                  className="group bg-white rounded-3xl border border-zinc-200 overflow-hidden hover:shadow-xl hover:border-zinc-300 transition-all"
                >
                  <div className="relative aspect-square bg-zinc-100">
                    {product.image ? (
                      <Image 
                        src={product.image} 
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <ImageIcon size={48} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenModal(product);
                        }}
                        className="w-8 h-8 bg-white/90 backdrop-blur shadow-sm rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, product.id)}
                        className="w-8 h-8 bg-white/90 backdrop-blur shadow-sm rounded-full flex items-center justify-center text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2 py-1 bg-zinc-900/80 backdrop-blur text-[10px] font-bold text-white rounded-md uppercase tracking-wider">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-zinc-900 line-clamp-1">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-zinc-400 font-mono">SKU: {product.sku}</p>
                          <div className="h-1 w-1 rounded-full bg-zinc-300" />
                          <p className={`text-[10px] font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-emerald-600'}`}>
                            Estoque: {product.stock}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-zinc-900">
                          {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        {product.cost > 0 && (
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            Margem: {(((product.price - product.cost) / product.price) * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="h-96 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300">
                  <Search size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Nenhum produto encontrado</h3>
                  <p className="text-sm text-zinc-500 mt-1">Tente ajustar sua busca ou cadastrar um novo item.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal CRUD */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-900">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nome do Produto</label>
                    <input 
                      required
                      type="text" 
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  
                  {/* Financeiro */}
                  <div className="col-span-2 pt-2 border-t">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Financeiro & Margem</h3>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Custo (CMV R$)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Preço de Venda (R$)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  
                  <div className="col-span-2 bg-zinc-900 text-white p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">Margem de Lucro</span>
                    <span className={`text-xl font-black ${margin >= 30 ? 'text-emerald-400' : margin > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      {margin.toFixed(2)}%
                    </span>
                  </div>

                  {/* Estoque */}
                  <div className="col-span-2 pt-4 border-t">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Controle de Estoque</h3>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Qtd. em Estoque</label>
                    <input 
                      required
                      type="number" 
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Mínimo</label>
                      <input 
                        required
                        type="number" 
                        className="w-full h-12 px-3 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Máximo</label>
                      <input 
                        required
                        type="number" 
                        className="w-full h-12 px-3 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                        value={formData.maxStock}
                        onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Classificação */}
                  <div className="col-span-2 pt-4 border-t">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Classificação & Identificação</h3>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Categoria</label>
                    <input 
                      required
                      type="text" 
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">SKU / Código</label>
                    <input 
                      required
                      type="text" 
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">URL da Imagem</label>
                    <input 
                      type="text" 
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 h-12 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 h-12 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all"
                  >
                    {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
