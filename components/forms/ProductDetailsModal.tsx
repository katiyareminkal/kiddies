import React, { useState } from 'react';
import { Modal } from '../Shared';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { Package, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const images = (product?.images && product.images.length > 0)
    ? product.images
    : product?.imageUrl
      ? [product.imageUrl]
      : [];

  const activeImg = images[activeImgIndex] || product?.imageUrl || '';

  return (
    <>
      <Modal isOpen={isOpen && !!product} onClose={onClose} title="Product Details">
        {product && (
          <div className="space-y-4 animate-nano max-h-[80vh] overflow-y-auto pr-1">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Multi-Image Gallery Viewer */}
              <div className="w-full sm:w-48 shrink-0 space-y-2">
                <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center relative group">
                  {activeImg ? (
                    <img
                      src={activeImg}
                      alt={product.name || 'Product'}
                      className="w-full h-full object-contain p-2 cursor-zoom-in hover:scale-105 transition-transform"
                      onClick={() => setLightboxImg(activeImg)}
                    />
                  ) : (
                    <Package size={40} className="text-slate-300" />
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveImgIndex((activeImgIndex - 1 + images.length) % images.length)}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImgIndex((activeImgIndex + 1) % images.length)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight size={14} strokeWidth={2.5} />
                      </button>
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                        {activeImgIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnails row */}
                {images.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImgIndex(idx)}
                        className={`w-9 h-9 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                          activeImgIndex === idx
                            ? 'border-[#01a9fb] ring-2 ring-[#01a9fb]/30 shadow-xs'
                            : 'border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="thumb" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Core Details */}
              <div className="flex-1 space-y-2.5">
                <div>
                  <span className="bg-teal-50 text-teal-700 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border border-teal-200">
                    {product.category || 'General'}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1.5">{product.name || 'Unnamed Product'}</h3>
                  <p className="text-xs font-mono font-bold text-slate-400 mt-0.5">SKU: {product.sku || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gender</span>
                    <span className="font-bold text-slate-700">{product.gender || 'Universal'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sub Category</span>
                    <span className="font-bold text-slate-700">{product.subCategory || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clothing Type</span>
                    <span className="font-bold text-slate-700">{product.clothingType || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Brand</span>
                    <span className="font-bold text-slate-700">{product.brand || 'In-House'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financials Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tag Price / MRP</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{formatCurrency(product.sellingPrice || 0)}</span>
              </div>
              {product.rentalPrice ? (
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rental Price</span>
                  <span className="text-sm font-extrabold text-[#fe569f] font-mono">{formatCurrency(product.rentalPrice)}/day</span>
                </div>
              ) : null}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Stock</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono">
                  {(product.saleStock || 0) + (product.rentalStock || 0)} units
                </span>
              </div>
            </div>

            {/* Sizes */}
            {Array.isArray(product.sizes) && product.sizes.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Available Sizes</span>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map(size => (
                    <span key={size} className="text-xs font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Close button */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-extrabold uppercase tracking-wider transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Fullscreen Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button 
            type="button" 
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all z-10"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
          <img 
            src={lightboxImg} 
            alt="Full Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-nano"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
