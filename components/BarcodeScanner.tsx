import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize the scanner when the component mounts
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 100 },
        aspectRatio: 1.0,
      },
      false // non-verbose
    );

    const handleScanSuccess = (decodedText: string) => {
      onScanSuccess(decodedText);
    };

    const handleScanError = () => {
       // We ignore scan errors as they happen continually when no barcode is in view
    };

    scannerRef.current.render(handleScanSuccess, handleScanError);

    // Clean up when the component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg overflow-hidden animate-nano flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100">
          <h3 className="text-[10px] md:text-xs font-bold text-gray-900 uppercase tracking-widest">
            Scan Barcode / SKU
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
        <div className="p-4 md:p-5 relative">
          <div id="reader" className="w-full rounded-md overflow-hidden border border-gray-200"></div>
          <p className="text-[8px] md:text-[9px] font-bold text-gray-400 text-center mt-4 uppercase tracking-widest">
            Position barcode inside the frame
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
