import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Move, Type, Square, Minus, Trash2, Save, Printer, CheckSquare, Layers, ChevronUp, ChevronDown, Eye, EyeOff, Download, Undo, Redo, RotateCw, LayoutGrid, FileDown, ZoomIn, ZoomOut, ImagePlus, Maximize2, Minimize2, Sticker, Shirt, Baby, ShoppingBag, Tag, Heart, Star, Smile, Scissors, IndianRupee, DollarSign, Euro, PoundSterling, Gift, Crown, Truck, Phone, Plus } from 'lucide-react';
import { LabelProduct, LabelTemplate, LabelElement, DEFAULT_TEMPLATE_30x50, DEFAULT_TEMPLATE_50x30, ensureSubCategoryElement, getEffectiveGender, cleanSizeLabel, cleanSku } from '../../utils/pdfLabel';
import html2canvas from 'html2canvas';

const ICON_LIBRARY = [
  { id: 'shirt', name: 'Shirt', icon: Shirt },
  { id: 'baby', name: 'Baby', icon: Baby },
  { id: 'shopping-bag', name: 'Bag', icon: ShoppingBag },
  { id: 'tag', name: 'Tag', icon: Tag },
  { id: 'heart', name: 'Heart', icon: Heart },
  { id: 'star', name: 'Star', icon: Star },
  { id: 'smile', name: 'Smile', icon: Smile },
  { id: 'scissors', name: 'Scissors', icon: Scissors },
  { id: 'indian-rupee', name: 'Rupee', icon: IndianRupee },
  { id: 'dollar-sign', name: 'Dollar', icon: DollarSign },
  { id: 'euro', name: 'Euro', icon: Euro },
  { id: 'pound-sterling', name: 'Pound', icon: PoundSterling },
  { id: 'gift', name: 'Gift', icon: Gift },
  { id: 'crown', name: 'Crown', icon: Crown },
  { id: 'truck', name: 'Truck', icon: Truck },
  { id: 'phone', name: 'Phone', icon: Phone },
];

const MM_TO_PX = 3.7795275591;

interface LabelDesignerProps {
  labelData: LabelProduct;
  initialTemplate?: LabelTemplate;
  allProductSizes?: string[];
  onClose: () => void;
  onPrint: (template: LabelTemplate, products: LabelProduct[]) => void;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  props!: { children: React.ReactNode };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-10 text-red-500 font-mono text-sm">
          <h1 className="text-2xl font-bold mb-4">React Crash</h1>
          <p>{this.state.error?.toString()}</p>
          <pre className="mt-4 p-4 bg-gray-100 text-gray-800 rounded max-w-4xl overflow-auto">{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} className="mt-8 px-4 py-2 bg-blue-500 text-white rounded">Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LabelDesignerWrapper(props: LabelDesignerProps) {
  return (
    <ErrorBoundary>
      <LabelDesigner {...props} />
    </ErrorBoundary>
  );
}

function LabelDesigner({ labelData, initialTemplate, allProductSizes = [], onClose, onPrint }: LabelDesignerProps) {
  const [printSizes, setPrintSizes] = useState<string[]>(allProductSizes && allProductSizes.length > 0 ? [...allProductSizes] : ['']);
  const [currentPresetName, setCurrentPresetName] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ message: string, defaultValue: string, onConfirm: (val: string) => void } | null>(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isIconGalleryOpen, setIsIconGalleryOpen] = useState(false);
  const [zoomedTemplate, setZoomedTemplate] = useState<LabelTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [savedLayouts, setSavedLayouts] = useState<{ name: string, template: LabelTemplate }[]>(() => {
    try {
      const saved = localStorage.getItem('kiddies_saved_layouts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((p: any) => p && p.name && p.template && Array.isArray(p.template.elements))
            .map((p: any) => ({ ...p, template: ensureSubCategoryElement(p.template) }));
        }
      }
    } catch (e) { }
    return [];
  });

  const [template, setTemplate] = useState<LabelTemplate>(() => {
    let tpl: LabelTemplate | null = null;
    if (initialTemplate && Array.isArray(initialTemplate.elements)) {
      tpl = initialTemplate;
    } else {
      try {
        const key = 'kiddies_label_template_' + ((labelData && labelData.labelSize) || '50x30');
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.elements)) {
            tpl = parsed;
          }
        }
      } catch (e) {}
    }
    if (!tpl) {
      tpl = (labelData && labelData.labelSize === '30x50') ? DEFAULT_TEMPLATE_30x50 : DEFAULT_TEMPLATE_50x30;
    }
    return ensureSubCategoryElement(tpl);
  });

  const isDirty = useMemo(() => {
    if (!currentPresetName) return false;
    const original = savedLayouts.find(l => l.name === currentPresetName)?.template;
    if (!original) return true;
    return JSON.stringify(original) !== JSON.stringify(template);
  }, [currentPresetName, savedLayouts, template]);

  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [dragMode, setDragMode] = useState<'none' | 'move' | 'resizeX' | 'resizeXY'>('none');
  const dragRef = useRef<{ mode: 'move' | 'resizeX' | 'resizeXY'; startX: number; startY: number; initialTemplate: LabelTemplate; elements: { id: string; startX: number; startY: number; startW: number; startH: number }[] } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastArrowTime = useRef<number>(0);

  const [historyPast, setHistoryPast] = useState<LabelTemplate[]>([]);
  const [historyFuture, setHistoryFuture] = useState<LabelTemplate[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const pushHistory = (stateToSave: LabelTemplate) => {
    setHistoryPast(prev => {
      const newHistory = [...prev, stateToSave];
      return newHistory.length > 30 ? newHistory.slice(newHistory.length - 30) : newHistory;
    });
    setHistoryFuture([]);
  };

  const [isCurrentlyDefault, setIsCurrentlyDefault] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedDefaultName = localStorage.getItem('kiddies_default_template_name_' + template.labelWidth + 'x' + template.labelHeight);
      if (savedDefaultName && currentPresetName) {
        setIsCurrentlyDefault(savedDefaultName === currentPresetName);
      } else {
        const savedDefault = localStorage.getItem('kiddies_label_template_' + template.labelWidth + 'x' + template.labelHeight);
        if (savedDefault) {
          setIsCurrentlyDefault(JSON.stringify(JSON.parse(savedDefault)) === JSON.stringify(template));
        } else {
          setIsCurrentlyDefault(false);
        }
      }
    } catch(e) {
      setIsCurrentlyDefault(false);
    }
  }, [template, currentPresetName]);

  const handleSetAsDefault = () => {
    localStorage.setItem('kiddies_label_template_' + template.labelWidth + 'x' + template.labelHeight, JSON.stringify(template));
    if (currentPresetName) {
      localStorage.setItem('kiddies_default_template_name_' + template.labelWidth + 'x' + template.labelHeight, currentPresetName);
    } else {
      localStorage.removeItem('kiddies_default_template_name_' + template.labelWidth + 'x' + template.labelHeight);
    }
    setIsCurrentlyDefault(true);
    showToast("This design is set as your default download layout!");
  };

  const handleAddIcon = (iconId: string) => {
    const divEl = document.getElementById(`gallery-icon-${iconId}`);
    if (!divEl) return;

    const svgNode = divEl.querySelector('svg');
    if (!svgNode) return;

    let svgString = new XMLSerializer().serializeToString(svgNode);

    // Ensure xmlns is present for browser image parsing
    if (!svgString.includes('xmlns=')) {
      svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    svgString = svgString.replace(/stroke="currentColor"/g, 'stroke="#000000"');

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 16, 16, 96, 96);
        const base64 = canvas.toDataURL('image/png');

        const id = 'icon_' + Date.now();
        const newEl: LabelElement = {
          id,
          type: 'image',
          x: template.labelWidth / 2,
          y: template.labelHeight / 2,
          width: 8,
          height: 8,
          visible: true,
          imageBase64: base64
        };

        const newState = {
          ...template,
          elements: [...template.elements, newEl]
        };
        pushHistory(template);
        setTemplate(newState);
        setSelectedElementIds([id]);
        setIsIconGalleryOpen(false);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = (e) => {
      console.error("Failed to load SVG", e);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const id = 'img_' + Date.now();
      const newEl: LabelElement = {
        id,
        type: 'image',
        x: template.labelWidth / 2,
        y: template.labelHeight / 2,
        width: 15,
        height: 15,
        visible: true,
        imageBase64: event.target?.result as string
      };
      pushHistory(template);
      setTemplate(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
      setSelectedElementIds([id]);
    };
    reader.readAsDataURL(file);
  };

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const prev = historyPast[historyPast.length - 1];
    setHistoryPast(historyPast.slice(0, -1));
    setHistoryFuture([template, ...historyFuture]);
    setTemplate(prev);
    setSelectedElementIds([]);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture(historyFuture.slice(1));
    setHistoryPast([...historyPast, template]);
    setTemplate(next);
    setSelectedElementIds([]);
  };

  const selectedElements = template.elements.filter(e => selectedElementIds.includes(e.id));
  const singleElement = selectedElements.length === 1 ? selectedElements[0] : null;

  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
      setSelectedElementIds([]);
      setHistoryPast([]);
      setHistoryFuture([]);
      return;
    }
    try {
      const saved = localStorage.getItem('kiddies_label_template_' + (labelData.labelSize || '30x50'));
      if (saved) {
        setTemplate(JSON.parse(saved));
        return;
      }
    } catch (e) { }
    setTemplate(labelData.labelSize === '50x30' ? DEFAULT_TEMPLATE_50x30 : DEFAULT_TEMPLATE_30x50);
    setSelectedElementIds([]);
    setHistoryPast([]);
    setHistoryFuture([]);
  }, [labelData.labelSize, initialTemplate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedElementIds(template.elements.map(el => el.id));
        return;
      }

      if (selectedElementIds.length > 0) {
        let dx = 0; let dy = 0;
        const step = e.shiftKey ? 2 : 0.5;

        if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        else if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'Delete' || e.key === 'Backspace') {
          pushHistory(template);
          setTemplate(prev => ({ ...prev, elements: prev.elements.filter(el => !selectedElementIds.includes(el.id)) }));
          setSelectedElementIds([]);
          return;
        }

        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          const now = Date.now();
          if (now - lastArrowTime.current > 500) {
            pushHistory(template);
          }
          lastArrowTime.current = now;
          setTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(el => {
              if (selectedElementIds.includes(el.id)) return { ...el, x: Math.max(0, Number(el.x) + dx), y: Math.max(0, Number(el.y) + dy) };
              return el;
            })
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, template]);

  const bringForward = (id: string) => {
    pushHistory(template);
    setTemplate(prev => {
      const idx = prev.elements.findIndex(e => e.id === id);
      if (idx === -1 || idx === prev.elements.length - 1) return prev;
      const newEls = [...prev.elements];
      [newEls[idx], newEls[idx + 1]] = [newEls[idx + 1], newEls[idx]];
      return { ...prev, elements: newEls };
    });
  };

  const sendBackward = (id: string) => {
    pushHistory(template);
    setTemplate(prev => {
      const idx = prev.elements.findIndex(e => e.id === id);
      if (idx <= 0) return prev;
      const newEls = [...prev.elements];
      [newEls[idx], newEls[idx - 1]] = [newEls[idx - 1], newEls[idx]];
      return { ...prev, elements: newEls };
    });
  };

  const updateSingleElement = (updates: Partial<LabelElement>) => {
    if (!singleElement) return;
    pushHistory(template);
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(e => e.id === singleElement.id ? { ...e, ...updates } : e)
    }));
  };

  const handlePointerDown = (e: React.PointerEvent, id: string, mode: 'move' | 'resizeX' | 'resizeXY' = 'move') => {
    e.stopPropagation();
    let newSelection = selectedElementIds;
    if (mode === 'move' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      if (newSelection.includes(id)) newSelection = newSelection.filter(i => i !== id);
      else newSelection = [...newSelection, id];
    } else {
      if (!newSelection.includes(id) || mode !== 'move') newSelection = [id];
    }

    setSelectedElementIds(newSelection);
    setDragMode(mode);

    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initialTemplate: template,
      elements: newSelection.map(selId => {
        const el = template.elements.find(x => x.id === selId)!;
        return { 
          id: selId, 
          startX: Number(el.x || 0), 
          startY: Number(el.y || 0), 
          startW: Number(el.width !== undefined ? el.width : 10), 
          startH: Number(el.height !== undefined ? el.height : 10) 
        };
      })
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const currentMode = dragRef.current.mode;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const currentScale = (isMobile ? 1.5 : 1) * zoomLevel;
    const dx = (e.clientX - dragRef.current.startX) / (MM_TO_PX * currentScale);
    const dy = (e.clientY - dragRef.current.startY) / (MM_TO_PX * currentScale);
    const dragElements = dragRef.current.elements;

    setTemplate(prev => {
      const newElements = [...prev.elements];
      dragElements.forEach(dragEl => {
        const idx = newElements.findIndex(el => el.id === dragEl.id);
        if (idx !== -1) {
          if (currentMode === 'move') {
            newElements[idx] = { ...newElements[idx], x: Math.max(0, dragEl.startX + dx), y: Math.max(0, dragEl.startY + dy) };
          } else {
            let newW = dragEl.startW;
            let newH = dragEl.startH;
            if (currentMode === 'resizeX' || currentMode === 'resizeXY') newW = Math.max(1, dragEl.startW + dx);
            if (currentMode === 'resizeXY') {
              newH = Math.max(0.1, dragEl.startH + dy);
              if (newElements[idx].type === 'image') {
                const ratio = dragEl.startW / dragEl.startH;
                newH = newW / ratio;
              }
            }
            newElements[idx] = { ...newElements[idx], width: newW, height: newH };
          }
        }
      });
      return { ...prev, elements: newElements };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      if (JSON.stringify(dragRef.current.initialTemplate) !== JSON.stringify(template)) {
        pushHistory(dragRef.current.initialTemplate);
      }
    }
    setDragMode('none');
    dragRef.current = null;
  };

  const handleDownloadImage = async () => {
    if (!canvasRef.current) return;

    const prevSelected = selectedElementIds;
    setSelectedElementIds([]);

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(canvasRef.current!, {
          scale: 4,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `kiddies_label_${labelData.sku || 'design'}.png`;
        link.click();
      } catch (err) {
        console.error('Failed to generate image', err);
        showToast('Failed to generate image.');
      } finally {
        setSelectedElementIds(prevSelected);
      }
    }, 50);
  };

  const handleSaveCurrentPreset = () => {
    if (!currentPresetName) return;
    const newLayouts = [...savedLayouts.filter(l => l.name !== currentPresetName), { name: currentPresetName, template }];
    setSavedLayouts(newLayouts);
    localStorage.setItem('kiddies_saved_layouts', JSON.stringify(newLayouts));
    localStorage.setItem('kiddies_label_template_' + template.labelWidth + 'x' + template.labelHeight, JSON.stringify(template));
    showToast(`Saved preset "${currentPresetName}" successfully!`);
  };

  const handleSaveTemplate = () => {
    const defaultName = currentPresetName ? `${currentPresetName} (Copy)` : `Preset ${template.labelWidth}x${template.labelHeight}`;
    setPromptDialog({
      message: 'Enter a name to save a copy of this design preset:',
      defaultValue: defaultName,
      onConfirm: (name) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setPromptDialog(null);
          return;
        }

        const templateCopy: LabelTemplate = {
          ...JSON.parse(JSON.stringify(template)),
          id: `custom_preset_${Date.now()}`,
          name: trimmedName,
          labelWidth: template.labelWidth,
          labelHeight: template.labelHeight
        };

        const newLayouts = [...savedLayouts.filter(l => l.name !== trimmedName), { name: trimmedName, template: templateCopy }];
        setSavedLayouts(newLayouts);
        localStorage.setItem('kiddies_saved_layouts', JSON.stringify(newLayouts));
        localStorage.setItem('kiddies_label_template_' + template.labelWidth + 'x' + template.labelHeight, JSON.stringify(templateCopy));
        setCurrentPresetName(trimmedName);
        showToast(`Saved copy as preset "${trimmedName}"!`);
        setPromptDialog(null);
      }
    });
  };

  const handleResetTemplate = () => {
    setConfirmDialog({
      message: 'Are you sure you want to reset to the default layout? All unsaved changes will be lost.',
      onConfirm: () => {
        setTemplate(template.labelWidth === 30 ? DEFAULT_TEMPLATE_30x50 : DEFAULT_TEMPLATE_50x30);
        setSelectedElementIds([]);
        setCurrentPresetName(null);
        setConfirmDialog(null);
        setHistoryPast([]);
        setHistoryFuture([]);
      }
    });
  };

  const handleCreateNewTemplate = () => {
    setConfirmDialog({
      message: 'Are you sure you want to start a brand new label design from scratch? All unsaved changes will be lost.',
      onConfirm: () => {
        setTemplate(prev => ({
          ...prev,
          elements: [
            { id: 'border', type: 'rect', x: 1.5, y: 1.5, width: prev.labelWidth - 3, height: prev.labelHeight - 3, borderRadius: 2, borderStyle: 'solid', visible: true }
          ]
        }));
        setSelectedElementIds([]);
        setCurrentPresetName(null);
        setConfirmDialog(null);
        setHistoryPast([]);
        setHistoryFuture([]);
      }
    });
  };

  const handleAddElement = (type: 'text' | 'line' | 'rect') => {
    pushHistory(template);
    const newId = `custom_${type}_${Date.now()}`;
    const newEl: LabelElement = { id: newId, type, x: template.labelWidth / 2, y: template.labelHeight / 2, visible: true };
    if (type === 'text') { newEl.staticText = 'New Text'; newEl.fontSize = 6; newEl.align = 'center'; newEl.fontFamily = 'helvetica'; }
    else if (type === 'line') { newEl.width = 10; newEl.height = 0.5; newEl.borderStyle = 'solid'; }
    else if (type === 'rect') { newEl.width = 10; newEl.height = 10; newEl.borderStyle = 'solid'; newEl.borderRadius = 0; }

    setTemplate(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElementIds([newId]);
  };

  const handleRotateCanvas = () => {
    pushHistory(template);
    setTemplate(prev => {
      const newW = prev.labelHeight;
      const newH = prev.labelWidth;

      return {
        ...prev,
        labelWidth: newW,
        labelHeight: newH,
        elements: prev.elements.map(el => {
          const isShape = el.type === 'rect' || el.type === 'line';

          let newX = newW - el.y;
          let newY = el.x;

          if (isShape) {
            const oldW = el.width !== undefined ? el.width : (el.type === 'line' ? 10 : 10);
            const oldH = el.height !== undefined ? el.height : (el.type === 'line' ? 0.5 : 10);
            newX = newW - el.y - oldH;

            return {
              ...el,
              x: newX,
              y: newY,
              width: oldH,
              height: oldW
            };
          } else {
            return {
              ...el,
              x: newX,
              y: newY,
              rotation: ((el.rotation || 0) + 90) % 360
            };
          }
        })
      };
    });
  };

  const handleRotateSelected = () => {
    if (selectedElementIds.length === 0) return;
    pushHistory(template);
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        if (!selectedElementIds.includes(el.id)) return el;
        const isShape = el.type === 'rect' || el.type === 'line';
        if (isShape) {
          const oldW = Number(el.width !== undefined ? el.width : (el.type === 'line' ? 10 : 10));
          const oldH = Number(el.height !== undefined ? el.height : (el.type === 'line' ? 0.5 : 10));
          const cx = Number(el.x) + oldW / 2;
          const cy = Number(el.y) + oldH / 2;
          return {
            ...el,
            width: oldH,
            height: oldW,
            x: cx - oldH / 2,
            y: cy - oldW / 2,
          };
        } else {
          return {
            ...el,
            rotation: ((el.rotation || 0) + 90) % 360
          };
        }
      })
    }));
  };

  const handleDeleteSelected = () => {
    pushHistory(template);
    setTemplate(prev => ({ ...prev, elements: prev.elements.filter(e => !selectedElementIds.includes(e.id)) }));
    setSelectedElementIds([]);
  };

  const getElementLayerLabel = (el: LabelElement): string => {
    if (el.type === 'text') {
      let val = el.staticText || '';
      if (el.id === 'name') val = (el.staticText || '') + (labelData.name || '').slice(0, 15).toUpperCase();
      else if (el.id === 'size') val = (el.staticText || '') + cleanSizeLabel(labelData.size || (printSizes && printSizes[0]) || '30').toUpperCase();
      else if (el.id === 'color') {
        const displayColor = (labelData.color || labelData.material || getEffectiveGender(labelData) || '').trim();
        if (displayColor) val = (el.staticText || '') + displayColor.toUpperCase();
      }
      else if (el.id === 'price') val = (el.staticText || '') + Number(labelData.sellingPrice || 0).toFixed(2);
      else if (el.id === 'code') val = (el.staticText || '') + '91' + ((labelData.purchasePrice || 0) * 2).toString();
      else if (el.id === 'sku') val = (el.staticText || '') + cleanSku(labelData.sku || '').toUpperCase();
      else if (el.id === 'size_lbl') val = el.staticText || 'SIZE';
      else if (el.id === 'rs_lbl') val = el.staticText || 'Rs.';

      val = val.trim();
      if (val) return val;
      return `Text: ${el.id.replace('custom_', '')}`;
    }

    if (el.type === 'rect') {
      if (el.id === 'size_box') return `Size Box (${el.width}×${el.height}mm)`;
      if (el.id === 'color_box') return `Color Box (${el.width}×${el.height}mm)`;
      if (el.id === 'price_box') return `Price Box (${el.width}×${el.height}mm)`;
      return `Box (${el.width || 10}×${el.height || 10}mm)`;
    }

    if (el.type === 'line') {
      if (el.id === 'size_line_l') return `Left Line`;
      if (el.id === 'size_line_r') return `Right Line`;
      if (el.id === 'div_vert') return `Vertical Line`;
      if (el.id === 'div_mid') return `Middle Line`;
      if (el.id === 'div_r1' || el.id === 'div_r2') return `Divider Line`;
      if (el.id === 'div_price') return `Price Line`;
      return `Line (${el.width || el.height || 10}mm)`;
    }

    if (el.type === 'image') return `Image / Icon`;
    if (el.type === 'barcode') return `Barcode`;

    return el.id;
  };

  const renderPreviewElement = (el: LabelElement, isMini = false) => {
    if (!el.visible) return null;
    const isSelected = !isMini && selectedElementIds.includes(el.id);
    const isSingleSelected = !isMini && selectedElementIds.length === 1 && isSelected;

    const isCentered = (el.type === 'text' && el.align === 'center') || el.type === 'barcode';
    const baseStyle: React.CSSProperties = {
      position: 'absolute', left: `${el.x * MM_TO_PX}px`, top: `${el.y * MM_TO_PX}px`, cursor: dragMode === 'none' ? 'grab' : 'grabbing',
      outline: isSelected ? '2px solid #8B5CF6' : '1px solid transparent', outlineOffset: '2px', userSelect: 'none',
      transform: isCentered ? `translateX(-50%) rotate(${el.rotation || 0}deg)` : `rotate(${el.rotation || 0}deg)`,
      transformOrigin: isCentered ? 'top center' : 'top left',
      zIndex: isSelected ? 50 : 'auto',
    };

    const renderHandle = (mode: 'resizeX' | 'resizeXY') => isSingleSelected && (
      <div
        style={{
          position: 'absolute', right: -5, bottom: mode === 'resizeXY' ? -5 : 'auto', top: mode === 'resizeX' ? '50%' : 'auto',
          transform: mode === 'resizeX' ? 'translateY(-50%)' : 'none', width: 10, height: 10,
          backgroundColor: '#8B5CF6', borderRadius: '50%', cursor: mode === 'resizeX' ? 'ew-resize' : 'nwse-resize', zIndex: 10,
          boxShadow: '0 0 0 2px white'
        }}
        onPointerDown={(e) => handlePointerDown(e, el.id, mode)}
      />
    );

    if (el.type === 'image') {
      return (
        <div key={el.id} style={{ ...baseStyle, width: `${(el.width || 10) * MM_TO_PX}px`, height: `${(el.height || 10) * MM_TO_PX}px` }} onPointerDown={(e) => handlePointerDown(e, el.id)}>
          <img src={el.imageBase64} className="w-full h-full object-fill pointer-events-none" />
          {renderHandle('resizeXY')}
        </div>
      );
    } else if (el.type === 'text') {
      let val = el.customValue !== undefined ? el.customValue : '';
      if (!val) {
        if (el.id === 'name') val = (labelData.name || '').slice(0, 23).toUpperCase();
        else if (el.id === 'size') val = cleanSizeLabel(labelData.size || (printSizes && printSizes[0]) || '30').toUpperCase();
        else if (el.id === 'color') {
          const displayColor = (labelData.color || labelData.material || getEffectiveGender(labelData) || '').trim();
          if (displayColor) val = displayColor.toUpperCase().slice(0, 12);
        }
        else if (el.id === 'style') val = (labelData.styleCode || '').toUpperCase();
        else if (el.id === 'price') val = Number(labelData.sellingPrice || 0).toFixed(2);
        else if (el.id === 'code') val = '91' + ((labelData.purchasePrice || 0) * 2).toString();
        else if (el.id === 'sku') val = cleanSku(labelData.sku || '').toUpperCase();
        else if (el.id === 'barcodeText') val = cleanSku(labelData.barcode || labelData.sku || '').toUpperCase();
        else if (el.id === 'subCategory' && labelData.subCategory) val = (labelData.subCategory || '').toUpperCase().slice(0, 10);
      }

      const prefix = el.staticText || '';
      const text = prefix + val;

      return (
        <div
          key={el.id}
          style={{
            ...baseStyle,
            top: `${el.y * MM_TO_PX}px`,
            fontSize: `${(el.fontSize || 6) * 1.33}px`,
            fontWeight: el.isBold ? 900 : 'normal',
            fontFamily: el.fontFamily === 'times' ? 'Times New Roman, Times, serif' : el.fontFamily === 'courier' ? 'Courier New, Courier, monospace' : 'Helvetica, Arial, sans-serif',
            whiteSpace: 'nowrap',
            color: '#1e293b',
            lineHeight: 1
          }}
          onPointerDown={(e) => handlePointerDown(e, el.id)}
        >
          {text}
        </div>
      );
    } else if (el.type === 'barcode') {
      const w = (el.width || 0.16) * 15 * MM_TO_PX; const h = (el.height || 7) * MM_TO_PX;
      return (
        <div key={el.id} style={{ ...baseStyle, width: `${w}px`, height: `${h}px`, backgroundColor: '#1e293b', backgroundImage: 'repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 2px, transparent 2px, transparent 4px)' }} onPointerDown={(e) => handlePointerDown(e, el.id)}>
          {renderHandle('resizeXY')}
        </div>
      );
    } else if (el.type === 'line') {
      const bStyle = el.borderStyle === 'dashed' ? 'dashed' : el.borderStyle === 'dotted' ? 'dotted' : 'solid';
      if (el.width === 0 && el.height !== undefined) {
        return (
          <div
            key={el.id}
            style={{
              ...baseStyle,
              width: 0,
              height: `${el.height * MM_TO_PX}px`,
              borderLeft: `0.8px ${bStyle} #1e293b`
            }}
            onPointerDown={(e) => handlePointerDown(e, el.id)}
          >
            {renderHandle('resizeXY')}
          </div>
        );
      }
      return (
        <div key={el.id} style={{ ...baseStyle, width: `${(el.width || 10) * MM_TO_PX}px`, minHeight: '1px', display: 'flex', alignItems: 'center' }} onPointerDown={(e) => handlePointerDown(e, el.id)}>
          <div style={{ width: '100%', height: 0, borderBottom: `${(el.height && el.height <= 1 ? el.height : 0.2) * MM_TO_PX}px ${bStyle} #1e293b`, pointerEvents: 'none' }} />
          {renderHandle('resizeX')}
        </div>
      );
    } else if (el.type === 'rect') {
      const bStyle = el.borderStyle === 'dashed' ? 'dashed' : el.borderStyle === 'dotted' ? 'dotted' : 'solid';
      return (
        <div key={el.id} style={{ ...baseStyle, width: `${(el.width || 10) * MM_TO_PX}px`, height: `${(el.height || 10) * MM_TO_PX}px`, border: `0.8px ${bStyle} #1e293b`, borderRadius: `${(el.borderRadius || 0) * MM_TO_PX}px`, backgroundColor: 'transparent' }} onPointerDown={(e) => handlePointerDown(e, el.id)}>
          {renderHandle('resizeXY')}
        </div>
      );
    }
    return null;
  };

  const checkIsTemplateDefault = (t: LabelTemplate, name: string) => {
    try {
      const savedDefaultName = localStorage.getItem('kiddies_default_template_name_' + t.labelWidth + 'x' + t.labelHeight);
      if (savedDefaultName) return savedDefaultName === name;

      const saved = localStorage.getItem('kiddies_label_template_' + t.labelWidth + 'x' + t.labelHeight);
      if (saved) return JSON.stringify(JSON.parse(saved)) === JSON.stringify(t);
    } catch(e) {}
    return false;
  };

  const handleSetTemplateAsDefault = (t: LabelTemplate, name: string) => {
    localStorage.setItem('kiddies_label_template_' + t.labelWidth + 'x' + t.labelHeight, JSON.stringify(t));
    localStorage.setItem('kiddies_default_template_name_' + t.labelWidth + 'x' + t.labelHeight, name);
    setIsCurrentlyDefault(true);
    showToast(`Template "${name}" set as default download format!`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:p-4 select-none"
      style={{ touchAction: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
    >
      {isIconGalleryOpen && (
        <div className="fixed inset-0 z-[210] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Choose Icon</h3>
              <button onClick={() => setIsIconGalleryOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-4 grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
              {ICON_LIBRARY.map(item => (
                <button key={item.id} onClick={() => handleAddIcon(item.id)} className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-slate-200">
                  <div id={`gallery-icon-${item.id}`}><item.icon size={24} className="text-gray-600" /></div>
                  <span className="text-[10px] uppercase font-bold text-gray-500">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`bg-white transition-all duration-300 flex flex-col overflow-hidden shadow-2xl ring-1 ring-black/5 ${isFullscreen ? 'w-full h-[100dvh] rounded-none' : 'w-full max-w-[1000px] h-[100dvh] md:h-[80vh] min-h-[400px] md:min-h-[500px] rounded-none md:rounded-xl'}`}>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-3 border-b border-gray-200/60 bg-white z-10 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white shadow-xs">
                <Layers size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800">Label Designer</h2>
                <p className="text-[9px] font-bold text-[#8B5CF6] uppercase tracking-widest mt-0.5 truncate max-w-[200px] md:max-w-none">
                  {currentPresetName ? `Editing Preset: ${currentPresetName}` : 'Free Transform & Multi-select'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden p-2 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-lg transition-colors shrink-0"><X size={18} strokeWidth={2.5} /></button>
          </div>

          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1 md:pb-0 shrink-0">
            <button onClick={handleUndo} disabled={historyPast.length === 0} className={`p-1.5 rounded-lg transition-colors shrink-0 ${historyPast.length === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100 hover:text-[#8B5CF6]'}`} title="Undo"><Undo size={14} /></button>
            <button onClick={handleRedo} disabled={historyFuture.length === 0} className={`p-1.5 rounded-lg transition-colors shrink-0 ${historyFuture.length === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100 hover:text-[#8B5CF6]'}`} title="Redo"><Redo size={14} /></button>
            <div className="w-px h-4 bg-slate-200 mx-1 shrink-0"></div>
            <button onClick={() => setIsTemplatesModalOpen(true)} className="px-2 md:px-3 py-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 rounded-lg font-bold uppercase tracking-widest text-[9px] flex items-center gap-1.5 transition-colors shrink-0">
              <LayoutGrid size={12} /> <span className="hidden xs:inline">Templates</span>
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1 shrink-0"></div>
            <button onClick={handleRotateSelected} disabled={selectedElementIds.length === 0} className={`p-1.5 rounded-lg transition-colors shrink-0 ${selectedElementIds.length === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100 hover:text-[#8B5CF6]'}`} title="Rotate Selected (90°)"><RotateCw size={14} /></button>
            <div className="w-px h-4 bg-slate-200 mx-1 shrink-0"></div>
            <button onClick={() => setSelectedElementIds(template.elements.map(e => e.id))} className="px-2 md:px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-gray-100 flex items-center gap-1 transition-colors shrink-0"><CheckSquare size={12} /> <span className="hidden sm:inline">Select All</span></button>
            <button onClick={handleResetTemplate} className="px-2 md:px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-gray-100 transition-colors shrink-0">Reset</button>
            <button onClick={handleCreateNewTemplate} className="px-2 md:px-3 py-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 rounded-lg font-bold uppercase tracking-widest text-[9px] flex items-center gap-1 transition-colors shrink-0"><Plus size={12} /> <span className="hidden xs:inline">Create New</span></button>

            {currentPresetName && (
              <button
                onClick={isDirty ? handleSaveCurrentPreset : undefined}
                className={`px-2 md:px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest text-[9px] flex items-center gap-1.5 transition-colors shrink-0 ${isDirty
                  ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 cursor-pointer'
                  : 'bg-emerald-50 text-emerald-500 cursor-default'
                  }`}
              >
                {isDirty ? <Save size={12} /> : <CheckSquare size={12} />}
                <span className="hidden sm:inline">{isDirty ? 'Save Changes' : 'Saved'}</span>
              </button>
            )}

            <button onClick={handleSaveTemplate} className="px-2 md:px-3 py-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-[#8B5CF6]/20 flex items-center gap-1.5 transition-colors shrink-0"><Save size={12} /> <span className="hidden sm:inline">Save As Preset</span></button>

            <button
              onClick={isCurrentlyDefault ? undefined : handleSetAsDefault}
              className={`px-2 md:px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest text-[9px] flex items-center gap-1.5 transition-colors shrink-0 ${
                isCurrentlyDefault
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                  : 'bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 cursor-pointer'
              }`}
            >
              <Star size={12} className={isCurrentlyDefault ? 'fill-emerald-500 text-emerald-500' : ''} />
              <span>{isCurrentlyDefault ? 'Default Layout' : 'Set as Default'}</span>
            </button>

            <div className="hidden md:flex items-center">
              <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors shrink-0 mr-1" title="Toggle Fullscreen">
                {isFullscreen ? <Minimize2 size={18} strokeWidth={2.5} /> : <Maximize2 size={18} strokeWidth={2.5} />}
              </button>
              <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-lg transition-colors shrink-0" title="Close"><X size={18} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-gray-50">
          <div className="w-full md:w-56 max-h-[35vh] md:max-h-none shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200/60 overflow-y-auto p-2 md:p-3 flex flex-col gap-2 md:gap-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
            <div className="space-y-1 md:space-y-2">
              <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-gray-400">Sizes to Print</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allProductSizes.length > 0 ? allProductSizes.map(size => {
                  const isSelected = printSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPrintSizes(prev => isSelected ? prev.filter(s => s !== size) : [...prev, size])}
                      className={`flex items-center justify-center min-w-[36px] h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border select-none ${
                        isSelected 
                          ? 'bg-[#7C3AED] text-white border-transparent shadow-xs' 
                          : 'bg-white text-gray-600 border-slate-200 hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/5'
                      }`}
                    >
                      {size}
                    </button>
                  );
                }) : <p className="text-[9px] md:text-[10px] text-gray-400 italic">No sizes selected.</p>}
              </div>
            </div>

            <div className="space-y-1 md:space-y-2">
              <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-gray-400">Add Tools</p>
              <div className="grid grid-cols-5 gap-1 md:gap-1.5">
                <button onClick={() => handleAddElement('text')} className="flex flex-col items-center justify-center gap-0.5 md:gap-1 bg-gray-50 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-[#8B5CF6]/30 hover:bg-white hover:shadow-sm text-gray-600 hover:text-[#8B5CF6] transition-all group">
                  <Type size={12} className="md:w-3.5 md:h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest">Text</span>
                </button>
                <button onClick={() => handleAddElement('rect')} className="flex flex-col items-center justify-center gap-0.5 md:gap-1 bg-gray-50 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-[#8B5CF6]/30 hover:bg-white hover:shadow-sm text-gray-600 hover:text-[#8B5CF6] transition-all group">
                  <Square size={12} className="md:w-3.5 md:h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest">Border</span>
                </button>
                <button onClick={() => handleAddElement('line')} className="flex flex-col items-center justify-center gap-0.5 md:gap-1 bg-gray-50 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-[#8B5CF6]/30 hover:bg-white hover:shadow-sm text-gray-600 hover:text-[#8B5CF6] transition-all group">
                  <Minus size={12} className="md:w-3.5 md:h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest">Line</span>
                </button>
                <button onClick={() => setIsIconGalleryOpen(true)} className="flex flex-col items-center justify-center gap-0.5 md:gap-1 bg-gray-50 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-[#8B5CF6]/30 hover:bg-white hover:shadow-sm text-gray-600 hover:text-[#8B5CF6] transition-all group">
                  <Sticker size={12} className="md:w-3.5 md:h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest">Icons</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-0.5 md:gap-1 bg-gray-50 p-1.5 md:p-2 rounded-lg border border-transparent hover:border-[#8B5CF6]/30 hover:bg-white hover:shadow-sm text-gray-600 hover:text-[#8B5CF6] transition-all group">
                  <ImagePlus size={12} className="md:w-3.5 md:h-3.5 group-hover:scale-110 transition-transform" />
                  <span className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest">Image</span>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-100 my-1"></div>

            {selectedElementIds.length > 1 ? (
              <div className="text-center py-6 bg-[#8B5CF6]/5 rounded-xl border border-[#8B5CF6]/20">
                <Move size={20} className="mx-auto mb-2 text-[#8B5CF6]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-800">{selectedElementIds.length} Elements Selected</p>
                <p className="text-[8px] text-gray-500 font-medium px-4 mt-1">Drag or use arrow keys to move them together.</p>
                <button onClick={handleDeleteSelected} className="mt-4 px-3 py-1.5 bg-rose-100 text-rose-600 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-rose-200 transition-colors">Delete Group</button>
              </div>
            ) : singleElement ? (
              <div className="space-y-4 animate-nano">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">{singleElement.type.toUpperCase()} Properties</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{singleElement.id.replace('custom_', '')}</p>
                  </div>
                  <button onClick={handleDeleteSelected} className="text-gray-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-gray-50 rounded-lg border border-gray-200/60 hover:border-[#8B5CF6]/30 transition-colors">
                    <input type="checkbox" checked={singleElement.visible} onChange={e => updateSingleElement({ visible: e.target.checked })} className="rounded w-3 h-3 text-[#8B5CF6] border-slate-300 focus:ring-[#8B5CF6]" />
                    <span className="text-[9px] font-bold uppercase text-gray-700 tracking-widest">Visible on Label</span>
                  </label>

                  {/* Position X and Y */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">X Position (mm)</label>
                      <input type="number" step="0.5" value={singleElement.x} onChange={e => updateSingleElement({ x: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Y Position (mm)</label>
                      <input type="number" step="0.5" value={singleElement.y} onChange={e => updateSingleElement({ y: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                    </div>
                  </div>

                  {singleElement.type === 'text' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Prefix / Static Text (e.g. Rs., SKU:)</label>
                        <input type="text" value={singleElement.staticText || ''} onChange={e => updateSingleElement({ staticText: e.target.value })} placeholder="Prefix (e.g. SKU :, CODE :, Rs.)" className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Value / Number Override</label>
                        <input
                          type="text"
                          value={singleElement.customValue !== undefined ? singleElement.customValue : ''}
                          onChange={e => updateSingleElement({ customValue: e.target.value })}
                          placeholder={`Default: ${
                            singleElement.id === 'size' ? (labelData.size || printSizes[0] || '30') :
                            singleElement.id === 'price' ? Number(labelData.sellingPrice || 0).toFixed(2) :
                            singleElement.id === 'code' ? '91' + ((labelData.purchasePrice || 0) * 2) :
                            singleElement.id === 'sku' ? (labelData.sku || '') : 'Automatic value'
                          }`}
                          className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold text-[#8B5CF6]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Alignment</label>
                          <select value={singleElement.align || 'center'} onChange={e => updateSingleElement({ align: e.target.value as any })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm">
                            <option value="center">Center</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Font Family</label>
                          <select value={singleElement.fontFamily || 'helvetica'} onChange={e => updateSingleElement({ fontFamily: e.target.value as any })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm">
                            <option value="helvetica">Helvetica</option>
                            <option value="times">Times</option>
                            <option value="courier">Courier</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Font Size (pt)</label>
                          <input type="number" step="0.5" value={singleElement.fontSize || 6} onChange={e => updateSingleElement({ fontSize: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-1.5 cursor-pointer p-2 bg-gray-50 rounded-lg border border-gray-200/60 hover:border-[#8B5CF6]/30 transition-colors w-full h-[32px]">
                            <input type="checkbox" checked={singleElement.isBold} onChange={e => updateSingleElement({ isBold: e.target.checked })} className="rounded text-[#8B5CF6] w-3 h-3" />
                            <span className="text-[8px] font-bold uppercase text-gray-700 tracking-widest">Bold Font</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {(singleElement.type === 'line' || singleElement.type === 'rect') && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Border Style</label>
                        <select value={singleElement.borderStyle || 'solid'} onChange={e => updateSingleElement({ borderStyle: e.target.value as any })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm">
                          <option value="solid">Solid Line</option>
                          <option value="dashed">Dashed Line</option>
                          <option value="dotted">Dotted Line</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Width (mm)</label>
                          <input type="number" step="0.5" value={singleElement.width || 10} onChange={e => updateSingleElement({ width: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">{singleElement.type === 'line' ? 'Thickness' : 'Height (mm)'}</label>
                          <input type="number" step="0.5" value={singleElement.height || (singleElement.type === 'line' ? 0.5 : 10)} onChange={e => updateSingleElement({ height: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                        </div>
                      </div>
                      {singleElement.type === 'rect' && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Border Radius (mm)</label>
                          <input type="number" step="0.5" value={singleElement.borderRadius || 0} onChange={e => updateSingleElement({ borderRadius: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                        </div>
                      )}
                    </div>
                  )}

                  {(singleElement.type === 'image' || singleElement.type === 'barcode') && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Width (mm)</label>
                          <input type="number" step="0.5" value={singleElement.width || 10} onChange={e => updateSingleElement({ width: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase text-gray-400 tracking-widest ml-1">Height (mm)</label>
                          <input type="number" step="0.5" value={singleElement.height || (singleElement.type === 'barcode' ? 7 : 10)} onChange={e => updateSingleElement({ height: Number(e.target.value) })} className="w-full bg-white border border-slate-200 focus:border-[#8B5CF6]/50 rounded-lg p-2 text-[10px] outline-none transition-all shadow-sm font-bold" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-3 border-2 border-dashed border-slate-200 rounded-xl opacity-70">
                <Move size={24} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-relaxed">Select an element on the canvas to customize its properties</p>
              </div>
            )}
          </div>

          {/* Canvas & Layers Container */}
          <div className="flex flex-row flex-1 overflow-hidden">
            {/* Center: Canvas Workspace */}
            <div
              className="flex-1 bg-[#F8FAFC] flex flex-col items-center justify-center p-2 md:p-4 overflow-auto relative"
              onPointerDown={() => setSelectedElementIds([])}
              style={{
                backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            >
              <div
                ref={canvasRef}
                className="bg-white relative transition-all duration-300 origin-center"
                style={{
                  transform: `scale(${(typeof window !== 'undefined' && window.innerWidth < 768 ? 1.5 : 1) * zoomLevel})`,
                  width: `${template.labelWidth * MM_TO_PX}px`,
                  height: `${template.labelHeight * MM_TO_PX}px`,
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)'
                }}
              >
                {/* Ruler Guide Grid Removed per request */}

                {template.elements.map(renderPreviewElement)}
              </div>

              <div className="absolute bottom-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full border border-slate-200 shadow-sm z-10">
                  <button onClick={() => setZoomLevel(prev => Math.max(0.25, prev - 0.25))} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-[#8B5CF6] transition-colors"><ZoomOut size={14} /></button>
                  <span className="text-[10px] font-bold w-9 text-center text-gray-700">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-[#8B5CF6] transition-colors"><ZoomIn size={14} /></button>
                </div>
                <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/50 shadow-sm pointer-events-none">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Workspace Size: <span className="text-gray-800">{template.labelWidth}mm × {template.labelHeight}mm</span></p>
                </div>
              </div>
            </div>

            {/* Right Panel: Layers */}
            <div className="w-28 md:w-48 shrink-0 bg-white border-l border-gray-200/60 overflow-y-auto flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">
              <div className="p-3 border-b border-gray-200/60 sticky top-0 bg-white/90 backdrop-blur-md z-10">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-800 flex items-center gap-1.5">
                  <Layers size={14} className="text-[#8B5CF6]" /> Layers
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {[...template.elements].reverse().map((el) => {
                  const isSelected = selectedElementIds.includes(el.id);
                  return (
                    <div
                      key={el.id}
                      onPointerDown={() => {
                        if (!selectedElementIds.includes(el.id)) {
                          setSelectedElementIds([el.id]);
                        }
                      }}
                      className={`group flex flex-col md:flex-row items-start md:items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-slate-200'}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 w-full mb-1.5 md:mb-0">
                        {el.type === 'text' ? <Type size={12} className={isSelected ? 'text-[#8B5CF6]' : 'text-gray-400'} /> : el.type === 'rect' ? <Square size={12} className={isSelected ? 'text-[#8B5CF6]' : 'text-gray-400'} /> : el.type === 'barcode' ? <span className={`text-[7px] font-bold tracking-widest ${isSelected ? 'text-[#8B5CF6]' : 'text-gray-400'}`}>|||</span> : <Minus size={12} className={isSelected ? 'text-[#8B5CF6]' : 'text-gray-400'} />}
                        <span className={`text-[9px] font-bold uppercase tracking-wider truncate ${isSelected ? 'text-[#8B5CF6]' : 'text-gray-600'}`}>
                          {getElementLayerLabel(el)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-0.5 justify-between w-full md:w-auto md:justify-end transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button onPointerDown={(e) => { e.stopPropagation(); bringForward(el.id); }} className="p-0.5 hover:bg-white rounded hover:text-[#8B5CF6] text-gray-400 hover:shadow-sm transition-all" title="Bring Forward">
                          <ChevronUp size={12} />
                        </button>
                        <button onPointerDown={(e) => { e.stopPropagation(); sendBackward(el.id); }} className="p-0.5 hover:bg-white rounded hover:text-[#8B5CF6] text-gray-400 hover:shadow-sm transition-all" title="Send Backward">
                          <ChevronDown size={12} />
                        </button>
                        <button onPointerDown={(e) => {
                          e.stopPropagation();
                          setTemplate(prev => ({ ...prev, elements: prev.elements.map(x => x.id === el.id ? { ...x, visible: !x.visible } : x) }));
                        }} className="p-0.5 hover:bg-white rounded hover:text-[#8B5CF6] text-gray-400 hover:shadow-sm transition-all ml-0.5" title="Toggle Visibility">
                          {el.visible ? <Eye size={12} /> : <EyeOff size={12} className="opacity-50" />}
                        </button>
                        <button onPointerDown={(e) => {
                          e.stopPropagation();
                          setTemplate(prev => ({ ...prev, elements: prev.elements.filter(x => x.id !== el.id) }));
                          setSelectedElementIds(prev => prev.filter(id => id !== el.id));
                        }} className="p-0.5 hover:bg-rose-50 rounded hover:text-rose-500 text-gray-400 hover:shadow-sm transition-all ml-0.5" title="Delete Element">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 md:p-3 border-t border-gray-200/60 flex flex-wrap justify-between items-center bg-white z-10 gap-2">
          <div>
            <button onClick={handleRotateCanvas} className="px-2 md:px-4 py-2 bg-gray-50 border border-slate-200 text-gray-600 rounded-lg font-bold uppercase tracking-widest text-[8px] md:text-[9px] hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-sm"><RotateCw size={12} /> <span className="hidden sm:inline">Rotate</span></button>
          </div>
          <div className="flex gap-1.5 md:gap-2 shrink-0">
            <button onClick={onClose} className="px-3 md:px-5 py-2 bg-gray-50 border border-slate-200 text-gray-600 rounded-lg font-bold uppercase tracking-widest text-[8px] md:text-[9px] hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={handleDownloadImage} className="flex px-3 md:px-5 py-2 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 rounded-lg font-bold uppercase tracking-widest text-[8px] md:text-[9px] hover:bg-[#8B5CF6]/20 transition-colors items-center gap-1.5"><Download size={12} /> Image</button>
            <button onClick={() => { const sizes = printSizes.length > 0 ? printSizes : ['']; const productsToPrint = sizes.map(s => ({ ...labelData, size: s })); onPrint(template, productsToPrint); }} className="px-3 md:px-5 py-2 bg-[#8B5CF6] text-white rounded-lg font-bold uppercase tracking-widest text-[8px] md:text-[9px] shadow-[0_4px_10px_rgba(139,92,246,0.2)] hover:shadow-[0_6px_12px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5"><FileDown size={12} /> PDF</button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-[11px] font-bold tracking-widest uppercase shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 z-[300]">
          <CheckSquare size={14} className="text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3">Please Confirm</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-[#8B5CF6]/30">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Prompt Dialog */}
      {promptDialog && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3">Save Preset</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">{promptDialog.message}</p>
            <input
              autoFocus
              type="text"
              defaultValue={promptDialog.defaultValue}
              className="w-full bg-gray-50 border border-slate-200 focus:border-[#8B5CF6] rounded-xl p-3 text-sm font-bold text-gray-800 outline-none transition-all mb-6"
              onKeyDown={(e) => {
                if (e.key === 'Enter') promptDialog.onConfirm(e.currentTarget.value);
                if (e.key === 'Escape') setPromptDialog(null);
              }}
              id="prompt-input"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setPromptDialog(null)} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">Cancel</button>
              <button onClick={() => promptDialog.onConfirm((document.getElementById('prompt-input') as HTMLInputElement).value)} className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-[#8B5CF6]/30">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {isTemplatesModalOpen && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-200/60 flex items-center justify-between bg-white relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 tracking-tight">Label Templates</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{savedLayouts.length} saved designs</p>
                </div>
              </div>
              <button onClick={() => setIsTemplatesModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              {savedLayouts.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white shadow-sm border border-gray-200/60 rounded-xl flex items-center justify-center mb-4">
                    <LayoutGrid size={28} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">No Templates Saved</p>
                  <p className="text-xs text-gray-400 mt-2 font-medium max-w-xs">Save your current design as a preset to see it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {savedLayouts.map(l => (
                    <div key={l.name} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-[#8B5CF6]/40 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative">
                      {/* Default Layout Star Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetTemplateAsDefault(l.template, l.name);
                        }}
                        className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-full border transition-all ${
                          checkIsTemplateDefault(l.template, l.name)
                            ? 'bg-emerald-50 text-emerald-500 border-emerald-200 shadow-sm'
                            : 'bg-white/90 backdrop-blur-sm text-gray-400 border-slate-200/50 hover:bg-[#8B5CF6] hover:text-white hover:border-transparent hover:shadow-md'
                        }`}
                        title={checkIsTemplateDefault(l.template, l.name) ? "Current Default Layout" : "Set as Default Layout"}
                      >
                        <Star size={12} className={checkIsTemplateDefault(l.template, l.name) ? 'fill-emerald-500 text-emerald-500 animate-pulse' : ''} />
                      </button>
                      <div
                        className="h-44 bg-gray-100/50 border-b border-gray-200/60 flex items-center justify-center relative p-4 overflow-hidden cursor-zoom-in"
                        onClick={() => setZoomedTemplate(l.template)}
                        title="Click to zoom"
                      >
                        <div style={{
                          width: l.template.labelWidth * MM_TO_PX,
                          height: l.template.labelHeight * MM_TO_PX,
                          transform: `scale(${Math.min(140 / (l.template.labelWidth * MM_TO_PX || 1), 140 / (l.template.labelHeight * MM_TO_PX || 1))})`,
                          position: 'relative',
                          backgroundColor: 'white',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }} className="pointer-events-none transition-transform duration-300 group-hover:scale-[1.05]">
                          {l.template.elements.map(e => renderPreviewElement(e, true))}
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-800 text-sm mb-1 truncate group-hover:text-[#8B5CF6] transition-colors">{l.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mb-5">
                          <span className="text-[9px] font-bold tracking-wider text-gray-500 bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded uppercase">{l.template.labelWidth}x{l.template.labelHeight} mm</span>
                          <span className="text-[9px] font-semibold text-gray-400">{l.template.elements.length} items</span>
                        </div>
                        <div className="mt-auto flex gap-2 relative z-10">
                          <button
                            className="flex-1 bg-gray-50 hover:bg-[#8B5CF6] text-gray-600 hover:text-white border border-slate-200 hover:border-transparent py-2 rounded-xl text-xs font-bold transition-all shadow-sm group-hover:bg-[#8B5CF6] group-hover:text-white"
                            onClick={() => {
                              setConfirmDialog({
                                message: `Load template "${l.name}"? Any unsaved changes will be lost.`,
                                onConfirm: () => {
                                  setTemplate(l.template);
                                  setSelectedElementIds([]);
                                  setCurrentPresetName(l.name);
                                  setConfirmDialog(null);
                                  setHistoryPast([]);
                                  setHistoryFuture([]);
                                  setIsTemplatesModalOpen(false);
                                }
                              });
                            }}
                          >
                            Load Template
                          </button>
                          <button
                            className="p-2 bg-gray-50 hover:bg-rose-500 text-gray-400 hover:text-white border border-slate-200 hover:border-transparent rounded-xl transition-all shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                message: `Are you sure you want to permanently delete template "${l.name}"?`,
                                onConfirm: () => {
                                  const newLayouts = savedLayouts.filter(x => x.name !== l.name);
                                  setSavedLayouts(newLayouts);
                                  localStorage.setItem('kiddies_saved_layouts', JSON.stringify(newLayouts));
                                  if (currentPresetName === l.name) setCurrentPresetName(null);
                                  setConfirmDialog(null);
                                }
                              });
                            }}
                            title="Delete Template"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zoomed Template Lightbox */}
      {zoomedTemplate && (
        <div
          className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedTemplate(null)}
        >
          <div
            className="relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: zoomedTemplate.labelWidth * MM_TO_PX,
              height: zoomedTemplate.labelHeight * MM_TO_PX,
              transform: `scale(${Math.min(800 / (zoomedTemplate.labelWidth * MM_TO_PX || 1), 800 / (zoomedTemplate.labelHeight * MM_TO_PX || 1), 3)})`,
              backgroundColor: 'white',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden'
            }} className="pointer-events-none">
              {zoomedTemplate.elements.map(e => renderPreviewElement(e, true))}
            </div>

            <button
              onClick={() => setZoomedTemplate(null)}
              className="absolute -top-4 -right-4 translate-x-full -translate-y-full p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      {/* Icon Gallery Modal */}
      {isIconGalleryOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200/60">
              <h3 className="font-bold text-gray-800 uppercase tracking-widest text-sm flex items-center gap-2"><Sticker size={16} className="text-[#8B5CF6]" /> Icon Library</h3>
              <button onClick={() => setIsIconGalleryOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-4 gap-3">
                {ICON_LIBRARY.map(ic => (
                  <button key={ic.id} onClick={() => handleAddIcon(ic.id)} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200/60 hover:border-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-all group">
                    <ic.icon size={28} id={`gallery-icon-${ic.id}`} className="text-gray-700 group-hover:text-[#8B5CF6]" strokeWidth={1.5} />
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-[#8B5CF6]">{ic.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
