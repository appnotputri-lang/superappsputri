import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader } from '../ui/PageLayout';
import { Product } from '../../../types';
import { ProductService } from '../../services/ProductService';
import { 
  Plus, Search, Edit2, Trash2, X, Check, Loader2, AlertCircle, 
  Package, DollarSign, FileText, CheckSquare, Square
} from 'lucide-react';

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form state
  const [name, setName] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [isTaxed, setIsTaxed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to products in Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = ProductService.subscribeProducts((data) => {
      // Sort alphabetically by name
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setProducts(sorted);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setUnitPrice('');
    setDescription('');
    setIsTaxed(false);
    setError(null);
    setIsModalOpen(true);
    if (window.location.pathname !== '/products/new') {
      navigate('/products/new');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name || '');
    setUnitPrice(product.unitPrice !== undefined && product.unitPrice !== null ? product.unitPrice : '');
    setDescription(product.description || '');
    setIsTaxed(!!product.isTaxed);
    setError(null);
    setIsModalOpen(true);
    if (!window.location.pathname.endsWith('/edit')) {
      navigate(`/products/${encodeURIComponent(product.id)}/edit`);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    if (window.location.pathname !== '/products') {
      navigate('/products');
    }
  };

  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    if (lastPart === 'new') {
      if (!isModalOpen || editingProduct) {
        openAddModal();
      }
    } else if (parts.length >= 3 && lastPart === 'edit') {
      const prodId = parts[parts.length - 2];
      if (!editingProduct || editingProduct.id !== prodId) {
        ProductService.getProductById(prodId).then(p => {
          if (p) openEditModal(p);
        });
      }
    } else if (parts.length <= 1 || lastPart === 'products') {
      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingProduct(null);
      }
    }
  }, [location.pathname]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama produk/layanan wajib diisi.');
      return;
    }
    if (unitPrice !== '' && unitPrice < 0) {
      setError('Tarif standard tidak boleh negatif.');
      return;
    }

    const productData = {
      name: name.trim(),
      unitPrice: unitPrice === '' ? undefined : unitPrice,
      description: description.trim(),
      isTaxed
    };

    // Optimistic UI: Close modal immediately in 0ms
    setIsModalOpen(false);

    try {
      if (editingProduct) {
        await ProductService.updateProduct(editingProduct.id, productData);
      } else {
        await ProductService.addProduct(productData);
      }
    } catch (err: any) {
      console.error('[ProductManager] Error saving product:', err);
      alert('Gagal menyimpan produk. Perubahan telah dikembalikan.');
    }
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${productName}"?`)) {
      try {
        await ProductService.deleteProduct(id);
      } catch (err) {
        console.error('[ProductManager] Error deleting product:', err);
        alert('Gagal menghapus produk.');
      }
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader
        title="Daftar Produk & Layanan"
        description="Kelola tarif standard dan jenis layanan untuk mempermudah pengisian Invoice dan Penawaran secara seragam."
        actions={
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2 transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Produk Baru</span>
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari produk atau layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredProducts.length} dari {products.length} produk
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-500">Memuat daftar produk...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Belum Ada Produk</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {searchQuery ? 'Tidak ada produk yang cocok dengan pencarian Anda.' : 'Tambahkan produk atau jenis layanan perdana Anda untuk memulai standardisasi tarif.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openAddModal}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm cursor-pointer"
                >
                  Tambah Produk Pertama
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-[1000px] w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Nama Produk / Layanan</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Tarif Standard</th>
                  <th className="py-3.5 px-4 min-w-[250px]">Deskripsi Default</th>
                  <th className="py-3.5 px-4 w-32 text-center">Kena Pajak</th>
                  <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-4 text-center font-medium text-slate-400">{index + 1}</td>
                    <td className="py-4 px-4 font-bold text-slate-950">{product.name}</td>
                    <td className="py-4 px-4 font-extrabold text-emerald-700">{formatCurrency(product.unitPrice)}</td>
                    <td className="py-4 px-4 text-slate-600 whitespace-pre-wrap">{product.description || '-'}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        product.isTaxed 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {product.isTaxed ? 'YA' : 'TIDAK'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                          title="Edit Produk"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                          title="Hapus Produk"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <Package className="text-emerald-600" size={16} />
                <span>{editingProduct ? 'Edit Produk / Layanan' : 'Tambah Produk Baru'}</span>
              </h3>
              <button 
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-5 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Nama Produk / Layanan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: AKTA PERUBAHAN PT SK"
                    className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Unit Price */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Tarif Standard (Rp) <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="5000000"
                      className="w-full pl-9 pr-3 py-2 text-xs text-slate-850 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-bold"
                    />
                  </div>
                </div>

                {/* Default Description */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Deskripsi Default (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Isi deskripsi default atau cakupan layanan..."
                    className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Taxable Checkbox */}
                <div className="flex items-center gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setIsTaxed(!isTaxed)}
                    className="text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                  >
                    {isTaxed ? (
                      <CheckSquare className="w-5 h-5 fill-emerald-50" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 hover:text-slate-500" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Kena Pajak Standard</span>
                    <span className="text-[10px] text-slate-400">Aktifkan jika produk ini dikenakan potongan PPh/PPN secara default</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg font-semibold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Produk</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
