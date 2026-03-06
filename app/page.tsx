'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { 
  Search, 
  Trash2, 
  Minus, 
  Plus, 
  ShoppingCart, 
  X, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  QrCode,
  Tag,
  Ban,
  ArrowRight,
  User,
  LayoutDashboard,
  Settings,
  LogOut,
  Loader2,
  Copy,
  Check,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  category: string;
  image: string;
  sku: string;
}

interface CartItem extends Product {
  quantity: number;
}

type PaymentMethod = 'dinheiro' | 'pix' | 'cartao';

export default function PDVPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [tempDiscount, setTempDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [pixData, setPixData] = useState<{ id: string; qr_code: string; qr_code_base64: string } | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Logic ---
  useEffect(() => {
    const fetchProducts = async () => {
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
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.includes(searchTerm)
    );
  }, [products, searchTerm]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const total = Math.max(0, subtotal - discount);

  const change = useMemo(() => {
    const received = parseFloat(amountReceived);
    if (isNaN(received)) return 0;
    return Math.max(0, received - total);
  }, [amountReceived, total]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cancelSale = () => {
    if (cart.length > 0) {
      setShowCancelModal(true);
    }
  };

  const confirmCancel = () => {
    setCart([]);
    setDiscount(0);
    setPaymentMethod(null);
    setShowCancelModal(false);
  };

  const confirmSale = React.useCallback(() => {
    if (!paymentMethod) return;
    setIsFinished(true);
    setTimeout(() => {
      setCart([]);
      setDiscount(0);
      setPaymentMethod(null);
      setShowPaymentModal(false);
      setIsFinished(false);
    }, 2000);
  }, [paymentMethod]);

  const applyDiscount = React.useCallback(() => {
    setShowDiscountModal(true);
    setTempDiscount(discount.toString());
  }, [discount]);

  const confirmDiscount = () => {
    const numValue = parseFloat(tempDiscount);
    if (!isNaN(numValue)) {
      setDiscount(numValue);
    }
    setShowDiscountModal(false);
  };

  const handleFinishSale = React.useCallback(() => {
    if (cart.length === 0) return;
    setAmountReceived('');
    setPaymentMethod(null);
    setPixData(null);
    setPixStatus(null);
    setShowPaymentModal(true);
  }, [cart.length]);

  const generatePix = async () => {
    if (total <= 0) {
      alert('O valor da venda deve ser maior que zero para gerar PIX.');
      return;
    }
    setIsGeneratingPix(true);
    try {
      const response = await fetch('/api/mercadopago/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total.toFixed(2),
          description: `Venda PDV - ${cart.length} itens`,
          email: 'vendedor@nexus-erp.com'
        })
      });
      const data = await response.json();
      if (data.error) {
        const detailMsg = data.details?.cause?.[0]?.description || data.error;
        throw new Error(detailMsg);
      }
      setPixData(data);
      setPixStatus(data.status);
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      alert('Erro ao gerar PIX. Verifique as configurações.');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const copyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Polling for PIX status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pixData?.id && pixStatus !== 'approved') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/mercadopago/status/${pixData.id}`);
          const data = await response.json();
          if (data.status === 'approved') {
            setPixStatus('approved');
            confirmSale();
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Erro ao verificar status:', error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [pixData, pixStatus, confirmSale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        applyDiscount();
      }
      if (e.key === 'F5') {
        e.preventDefault();
        handleFinishSale();
      }
      if (e.key === 'Escape') {
        setShowPaymentModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyDiscount, handleFinishSale]);

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 text-white p-2 rounded-lg">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight uppercase">Nexus ERP</h1>
            <p className="text-[10px] text-zinc-500 font-mono">PDV • CAIXA 01 • OPERADOR: JOÃO</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link 
            href="/produtos" 
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all"
          >
            <Package size={16} />
            Produtos
          </Link>
          <div className="h-6 w-px bg-zinc-200" />
          <div className="flex items-center gap-2 text-zinc-600">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border">
              <User size={16} />
            </div>
            <span className="text-sm font-medium">João Silva</span>
          </div>
          <div className="h-6 w-px bg-zinc-200" />
          <button className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <Settings size={20} />
          </button>
          <button className="text-zinc-400 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Product Selection */}
        <div className="flex-[1.5] flex flex-col p-6 gap-6 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              id="search-input"
              type="text"
              placeholder="Pesquisar produto ou SKU (F1)..."
              className="w-full h-12 pl-12 pr-4 bg-white border rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm font-medium">Carregando catálogo...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <motion.button
                    key={product.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(product)}
                    className="group bg-white border rounded-2xl p-3 text-left hover:shadow-lg hover:border-zinc-300 transition-all"
                  >
                    <div className="aspect-square rounded-xl bg-zinc-50 mb-3 overflow-hidden relative">
                      <Image 
                        src={product.image} 
                        alt={product.name} 
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 line-clamp-1">{product.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mb-2">{product.sku}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-900">
                        {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Plus size={14} />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart Summary */}
        <div className="flex-1 bg-white border-l flex flex-col shadow-2xl z-10">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="text-zinc-400" size={20} />
              <h2 className="font-bold text-zinc-900">Carrinho</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => cart.length > 0 && setShowCancelModal(true)}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-wider"
              >
                Limpar
              </button>
              <span className="text-xs font-bold bg-zinc-100 px-2 py-1 rounded-full text-zinc-600">
                {cart.reduce((acc, item) => acc + item.quantity, 0)} ITENS
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
                  <ShoppingCart size={48} strokeWidth={1} />
                  <p className="text-sm">O carrinho está vazio</p>
                </div>
              ) : (
                cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-zinc-50 overflow-hidden shrink-0 relative">
                      <Image src={item.image} alt={item.name} fill className="object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-900 truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center border rounded-md overflow-hidden">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-zinc-100 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 text-xs font-bold min-w-[24px] text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-zinc-100 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="text-[10px] text-zinc-400">x {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-zinc-900">
                        {(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-zinc-300 hover:text-red-600 transition-colors mt-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Totals & Actions */}
          <div className="p-6 bg-zinc-50 border-t space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span>
                <span className="font-medium">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Desconto</span>
                <span className="font-medium text-emerald-600">- {discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-lg font-bold text-zinc-900">Total</span>
                <span className="text-3xl font-black text-zinc-900 tracking-tighter">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={applyDiscount}
                className="flex items-center justify-center gap-2 h-11 border bg-white rounded-xl text-sm font-semibold hover:bg-zinc-100 transition-all"
              >
                <Tag size={16} />
                Desconto (F3)
              </button>
              <button 
                onClick={cancelSale}
                className="flex items-center justify-center gap-2 h-11 border bg-white rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
              >
                <Ban size={16} />
                Cancelar
              </button>
            </div>

            <button 
              onClick={handleFinishSale}
              disabled={cart.length === 0}
              className="w-full h-16 bg-zinc-900 text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalizar Venda (F5)
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </main>

      {/* Footer Shortcuts */}
      <footer className="h-10 bg-zinc-900 text-white flex items-center justify-center gap-8 px-6 shrink-0">
        <div className="flex items-center gap-2">
          <kbd className="bg-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono">F1</kbd>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pesquisar</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="bg-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono">F3</kbd>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Desconto</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="bg-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono">F5</kbd>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Finalizar</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="bg-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono">ESC</kbd>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Voltar</span>
        </div>
      </footer>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <Ban size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Cancelar Venda?</h2>
                  <p className="text-sm text-zinc-500 mt-2">Todos os itens do carrinho serão removidos e esta operação não poderá ser desfeita.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowCancelModal(false)}
                    className="h-12 border rounded-xl font-semibold hover:bg-zinc-50 transition-all"
                  >
                    Não, Voltar
                  </button>
                  <button 
                    onClick={confirmCancel}
                    className="h-12 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
                  >
                    Sim, Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Discount Modal */}
      <AnimatePresence>
        {showDiscountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDiscountModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Aplicar Desconto</h2>
                <button onClick={() => setShowDiscountModal(false)} className="text-zinc-400 hover:text-zinc-900">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Valor do Desconto (R$)</label>
                  <input 
                    autoFocus
                    type="number" 
                    className="w-full h-14 text-2xl font-bold border-b-2 border-zinc-200 focus:border-zinc-900 outline-none transition-all mt-2"
                    value={tempDiscount}
                    onChange={(e) => setTempDiscount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmDiscount()}
                  />
                </div>
                <button 
                  onClick={confirmDiscount}
                  className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                >
                  Confirmar Desconto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {isFinished ? (
                <div className="p-12 flex flex-col items-center justify-center text-center gap-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle2 size={48} />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Venda Realizada!</h2>
                    <p className="text-zinc-500 mt-2">O comprovante está sendo impresso...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold">Pagamento</h2>
                    <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-zinc-900">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="text-center">
                      <p className="text-sm text-zinc-500 uppercase font-bold tracking-widest">Valor a Pagar</p>
                      <h3 className="text-4xl font-black text-zinc-900 mt-1">
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => {
                          setPaymentMethod('dinheiro');
                          setAmountReceived('');
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                          paymentMethod === 'dinheiro' ? "border-zinc-900 bg-zinc-50" : "border-zinc-100 hover:border-zinc-300"
                        )}
                      >
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Banknote size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">Dinheiro</p>
                          <p className="text-xs text-zinc-500">Pagamento em espécie</p>
                        </div>
                      </button>

                      {paymentMethod === 'dinheiro' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Valor Recebido</label>
                              <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">R$</span>
                                <input 
                                  autoFocus
                                  type="number" 
                                  placeholder="0,00"
                                  className="w-full h-11 pl-10 pr-3 bg-white border rounded-xl font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                                  value={amountReceived}
                                  onChange={(e) => setAmountReceived(e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Troco</label>
                              <div className="h-11 flex items-center px-3 bg-emerald-50 border border-emerald-100 rounded-xl mt-1">
                                <span className="text-lg font-black text-emerald-600">
                                  {change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <button 
                        onClick={() => {
                          setPaymentMethod('pix');
                          if (!pixData) generatePix();
                        }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                          paymentMethod === 'pix' ? "border-zinc-900 bg-zinc-50" : "border-zinc-100 hover:border-zinc-300"
                        )}
                      >
                        <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                          {isGeneratingPix ? <Loader2 className="animate-spin" size={24} /> : <QrCode size={24} />}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">PIX</p>
                          <p className="text-xs text-zinc-500">Transferência instantânea</p>
                        </div>
                      </button>

                      {paymentMethod === 'pix' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col items-center gap-4"
                        >
                          {isGeneratingPix ? (
                            <div className="flex flex-col items-center gap-2 py-4">
                              <Loader2 className="animate-spin text-zinc-400" size={32} />
                              <p className="text-xs font-medium text-zinc-500">Gerando QR Code...</p>
                            </div>
                          ) : pixData ? (
                            <>
                              <div className="bg-white p-3 rounded-2xl border-2 border-zinc-100 relative w-48 h-48">
                                <Image 
                                  src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                                  alt="QR Code PIX" 
                                  fill
                                  unoptimized
                                  className="object-contain"
                                />
                              </div>
                              <div className="w-full space-y-2">
                                <button 
                                  onClick={copyPix}
                                  className="w-full h-11 flex items-center justify-center gap-2 border bg-white rounded-xl text-xs font-bold hover:bg-zinc-100 transition-all"
                                >
                                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                  {copied ? 'Copiado!' : 'Copiar Código PIX'}
                                </button>
                                <p className="text-[10px] text-center text-zinc-400 uppercase font-bold tracking-widest">
                                  Aguardando pagamento...
                                </p>
                              </div>
                            </>
                          ) : (
                            <button 
                              onClick={generatePix}
                              className="text-xs font-bold text-zinc-900 underline"
                            >
                              Tentar gerar novamente
                            </button>
                          )}
                        </motion.div>
                      )}

                      <button 
                        onClick={() => setPaymentMethod('cartao')}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                          paymentMethod === 'cartao' ? "border-zinc-900 bg-zinc-50" : "border-zinc-100 hover:border-zinc-300"
                        )}
                      >
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">Cartão</p>
                          <p className="text-xs text-zinc-500">Crédito ou Débito</p>
                        </div>
                      </button>
                    </div>

                    <button 
                      onClick={confirmSale}
                      disabled={!paymentMethod}
                      className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all"
                    >
                      Confirmar Pagamento
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>
    </div>
  );
}
