import React, { useState } from 'react';
import {
  GitFork,
  BarChart3,
  PieChart,
  Plus,
  Trash2,
  Check,
  Move,
  Layers,
  ArrowRight,
  Database,
  Diamond,
  Square,
  CircleDot,
} from 'lucide-react';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { PrdMetricChartViewer } from '../../molecules/PrdMetricChartViewer';

export interface PrdDiagramStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToPrd: (markdownSnippet: string) => void;
}

export type CanvasNodeType = 'start' | 'process' | 'decision' | 'database';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  label: string;
  x: number;
  y: number;
}

export interface CanvasEdge {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

export interface MetricBarItem {
  id: string;
  label: string;
  value: number;
  target?: number;
}

const PALETTE_ITEMS: {
  type: CanvasNodeType;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { type: 'start', label: 'Mulai / Selesai', icon: CircleDot },
  { type: 'process', label: 'Proses Logika', icon: Square },
  { type: 'decision', label: 'Kondisi / Keputusan', icon: Diamond },
  { type: 'database', label: 'Basis Data / Storage', icon: Database },
];

export const PrdDiagramStudioModal: React.FC<PrdDiagramStudioModalProps> = ({
  isOpen,
  onClose,
  onApplyToPrd,
}) => {
  const [studioMode, setStudioMode] = useState<'flowchart' | 'metric'>('flowchart');

  // --- Flowchart Canvas State ---
  const [nodes, setNodes] = useState<CanvasNode[]>([
    { id: 'node-1', type: 'start', label: 'Pengguna Klik Tombol', x: 50, y: 50 },
    { id: 'node-2', type: 'process', label: 'Sistem Validasi Request', x: 260, y: 50 },
    { id: 'node-3', type: 'database', label: 'Simpan ke Database', x: 500, y: 50 },
  ]);
  const [edges, setEdges] = useState<CanvasEdge[]>([
    { id: 'edge-1', fromId: 'node-1', toId: 'node-2' },
    { id: 'edge-2', fromId: 'node-2', toId: 'node-3' },
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectToId, setConnectToId] = useState<string>('');

  // Dragging state on canvas
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // --- Metric Chart State ---
  const [metricChartType, setMetricChartType] = useState<'bar' | 'donut'>('bar');
  const [metricTitle, setMetricTitle] = useState('Target Kecepatan dan Efisiensi Fitur');
  const [metricUnit, setMetricUnit] = useState('ms');
  const [metricBars, setMetricBars] = useState<MetricBarItem[]>([
    { id: 'b1', label: 'Sebelum Optimasi', value: 450, target: 200 },
    { id: 'b2', label: 'Setelah Rilis Fitur', value: 160, target: 200 },
  ]);
  const [donutValue, setDonutValue] = useState(85);
  const [donutMax, setDonutMax] = useState(100);
  const [donutSubtitle, setDonutSubtitle] = useState(
    'Persentase Target Keberhasilan / Test Coverage',
  );

  // Generate Mermaid Code
  const generateMermaidCode = (): string => {
    if (nodes.length === 0) return '```mermaid\nflowchart TD\n  Empty[Belum ada elemen alur]\n```';

    const lines: string[] = ['flowchart TD'];

    nodes.forEach((n) => {
      const safeId = n.id.replace(/-/g, '_');
      const safeLabel = `"${n.label.replace(/"/g, "'")}"`;
      if (n.type === 'start') {
        lines.push(`  ${safeId}([${safeLabel}])`);
      } else if (n.type === 'decision') {
        lines.push(`  ${safeId}{${safeLabel}}`);
      } else if (n.type === 'database') {
        lines.push(`  ${safeId}[(${safeLabel})]`);
      } else {
        lines.push(`  ${safeId}[${safeLabel}]`);
      }
    });

    edges.forEach((e) => {
      const from = e.fromId.replace(/-/g, '_');
      const to = e.toId.replace(/-/g, '_');
      if (e.label) {
        lines.push(`  ${from} -->|${e.label}| ${to}`);
      } else {
        lines.push(`  ${from} --> ${to}`);
      }
    });

    return `\`\`\`mermaid\n${lines.join('\n')}\n\`\`\``;
  };

  // Generate Metric Chart JSON Code
  const generateMetricChartCode = (): string => {
    if (metricChartType === 'donut') {
      const config = {
        type: 'donut',
        title: metricTitle || 'Indikator Target Capaian',
        value: Number(donutValue) || 0,
        max: Number(donutMax) || 100,
        unit: metricUnit || '%',
        subtitle: donutSubtitle,
      };
      return `\`\`\`chart\n${JSON.stringify(config, null, 2)}\n\`\`\``;
    }

    const config = {
      type: 'bar',
      title: metricTitle || 'Grafik Target Metrik',
      unit: metricUnit,
      data: metricBars.map((b) => ({
        label: b.label,
        value: Number(b.value) || 0,
        target: b.target !== undefined ? Number(b.target) : undefined,
      })),
    };
    return `\`\`\`chart\n${JSON.stringify(config, null, 2)}\n\`\`\``;
  };

  // Drag over canvas from palette or canvas movement
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = Math.max(10, Math.round(e.clientX - rect.left - 40));
    const dropY = Math.max(10, Math.round(e.clientY - rect.top - 20));

    const paletteType = e.dataTransfer.getData('application/qlick-palette-type') as CanvasNodeType;
    if (paletteType) {
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        type: paletteType,
        label:
          paletteType === 'start'
            ? 'Titik Awal'
            : paletteType === 'decision'
              ? 'Kondisi Validasi?'
              : paletteType === 'database'
                ? 'Tabel Database'
                : 'Langkah Proses',
        x: dropX,
        y: dropY,
      };
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      return;
    }

    if (draggedNodeId) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNodeId
            ? {
                ...n,
                x: Math.max(10, e.clientX - rect.left - dragOffset.x),
                y: Math.max(10, e.clientY - rect.top - dragOffset.y),
              }
            : n,
        ),
      );
      setDraggedNodeId(null);
    }
  };

  const handleApply = () => {
    const code = studioMode === 'flowchart' ? generateMermaidCode() : generateMetricChartCode();
    onApplyToPrd(code);
    onClose();
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const addEdge = () => {
    if (!selectedNodeId || !connectToId || selectedNodeId === connectToId) return;
    const exists = edges.some((e) => e.fromId === selectedNodeId && e.toId === connectToId);
    if (!exists) {
      setEdges((prev) => [
        ...prev,
        { id: `edge-${Date.now()}`, fromId: selectedNodeId, toId: connectToId },
      ]);
    }
    setConnectToId('');
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter((e) => e.fromId !== selectedNodeId && e.toId !== selectedNodeId),
    );
    setSelectedNodeId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visual Diagram & Grafik Studio" size="xl">
      <div className="space-y-4" data-testid="prd-diagram-studio">
        {/* Mode Tab Switcher */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStudioMode('flowchart')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                studioMode === 'flowchart'
                  ? 'bg-[#166534] text-white dark:bg-[#B1E743] dark:text-[#141413] shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Diagram Alur (Flowchart)</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode('metric')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                studioMode === 'metric'
                  ? 'bg-[#166534] text-white dark:bg-[#B1E743] dark:text-[#141413] shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Grafik Metrik & Target</span>
            </button>
          </div>

          <p className="text-xs text-stone-500 hidden sm:block">
            Tarik komponen ke kanvas, atur label, lalu terapkan langsung ke dokumen PRD.
          </p>
        </div>

        {/* MODE 1: FLOWCHART DRAG & DROP CANVAS */}
        {studioMode === 'flowchart' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[420px]">
            {/* Palette Panel */}
            <div className="md:col-span-3 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-900/60">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>Palette Node (Tarik ke Kanvas)</span>
              </h4>

              <div className="space-y-2">
                {PALETTE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/qlick-palette-type', item.type);
                      }}
                      className="flex cursor-grab items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-stone-800 shadow-xs transition hover:border-[#3F6212] hover:shadow dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 active:cursor-grabbing"
                    >
                      <Icon className="h-4 w-4 text-[#166534] dark:text-[#B1E743]" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Node Inspector / Editor */}
              {selectedNode ? (
                <div className="space-y-2.5 border-t border-stone-200 pt-3 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                      Edit Node Terpilih
                    </span>
                    <button
                      type="button"
                      onClick={deleteSelectedNode}
                      className="text-rose-600 hover:text-rose-700 p-1 rounded"
                      title="Hapus node"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Input
                    label="Label Node"
                    value={selectedNode.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) => (n.id === selectedNode.id ? { ...n, label: val } : n)),
                      );
                    }}
                  />

                  {/* Connect to other node */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                      Hubungkan Alur ke:
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={connectToId}
                        onChange={(e) => setConnectToId(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-white px-2 py-1.5 text-xs dark:border-stone-700 dark:bg-stone-800"
                      >
                        <option value="">Pilih target...</option>
                        {nodes
                          .filter((n) => n.id !== selectedNode.id)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}
                            </option>
                          ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addEdge}
                        disabled={!connectToId}
                        className="h-8 shrink-0 px-2"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-400 italic pt-2">
                  Klik node pada kanvas untuk mengedit teks atau menyambungkan panah alur.
                </p>
              )}
            </div>

            {/* Interactive Canvas Area */}
            <div
              data-testid="diagram-canvas"
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              className="md:col-span-9 relative min-h-[380px] overflow-hidden rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-950/40 select-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(160, 160, 160, 0.15) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              {/* SVG Edges connection arrows */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 8 3, 0 6"
                      className="fill-stone-400 dark:fill-stone-600"
                    />
                  </marker>
                </defs>
                {edges.map((edge) => {
                  const fromNode = nodes.find((n) => n.id === edge.fromId);
                  const toNode = nodes.find((n) => n.id === edge.toId);
                  if (!fromNode || !toNode) return null;

                  return (
                    <line
                      key={edge.id}
                      x1={fromNode.x + 80}
                      y1={fromNode.y + 20}
                      x2={toNode.x + 80}
                      y2={toNode.y + 20}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-stone-400 dark:text-stone-600"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
              </svg>

              {/* Render Nodes on Canvas */}
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <div
                    key={node.id}
                    data-testid={`canvas-node-${node.id}`}
                    onClick={() => setSelectedNodeId(node.id)}
                    draggable
                    onDragStart={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDraggedNodeId(node.id);
                      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute z-10 w-44 cursor-move rounded-xl border p-2.5 text-center shadow-xs transition-all ${
                      isSelected
                        ? 'border-[#3F6212] ring-2 ring-[#B1E743] bg-white dark:bg-stone-900'
                        : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 text-[10px] text-stone-400">
                      <span className="uppercase font-bold tracking-wider">{node.type}</span>
                      <Move className="h-2.5 w-2.5 text-stone-400" />
                    </div>
                    <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-200">
                      {node.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* MODE 2: METRIC CHART BUILDER */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Form Configuration */}
            <div className="md:col-span-5 space-y-3.5 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/60">
              <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Konfigurasi Grafik Metrik
              </h4>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMetricChartType('bar')}
                  className={`flex-1 rounded-xl p-2 text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                    metricChartType === 'bar'
                      ? 'border-[#166534] bg-white text-[#166534] dark:border-[#B1E743] dark:bg-stone-800 dark:text-[#B1E743]'
                      : 'border-stone-200 bg-transparent text-stone-600 dark:border-stone-700'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Bar Chart Target</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetricChartType('donut')}
                  className={`flex-1 rounded-xl p-2 text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                    metricChartType === 'donut'
                      ? 'border-[#166534] bg-white text-[#166534] dark:border-[#B1E743] dark:bg-stone-800 dark:text-[#B1E743]'
                      : 'border-stone-200 bg-transparent text-stone-600 dark:border-stone-700'
                  }`}
                >
                  <PieChart className="h-3.5 w-3.5" />
                  <span>Donut / KPI Ring</span>
                </button>
              </div>

              <Input
                label="Judul Grafik"
                value={metricTitle}
                onChange={(e) => setMetricTitle(e.target.value)}
              />

              <Input
                label="Satuan Unit (misal: %, ms, User, RPS)"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
              />

              {metricChartType === 'bar' ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Data Batang ({metricBars.length})
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMetricBars((prev) => [
                          ...prev,
                          {
                            id: `bar-${Date.now()}`,
                            label: `Item ${prev.length + 1}`,
                            value: 100,
                            target: 200,
                          },
                        ])
                      }
                      className="h-7 text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Tambah
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {metricBars.map((bar, idx) => (
                      <div
                        key={bar.id}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-800"
                      >
                        <input
                          type="text"
                          value={bar.label}
                          placeholder="Label"
                          onChange={(e) => {
                            const val = e.target.value;
                            setMetricBars((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, label: val } : b)),
                            );
                          }}
                          className="flex-1 rounded-lg border border-stone-200 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-900"
                        />
                        <input
                          type="number"
                          value={bar.value}
                          placeholder="Nilai"
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setMetricBars((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, value: val } : b)),
                            );
                          }}
                          className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-900"
                        />
                        <input
                          type="number"
                          value={bar.target ?? ''}
                          placeholder="Target"
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            setMetricBars((prev) =>
                              prev.map((b, i) => (i === idx ? { ...b, target: val } : b)),
                            );
                          }}
                          className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-900"
                        />
                        <button
                          type="button"
                          onClick={() => setMetricBars((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-stone-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <Input
                    label="Nilai Realisasi / Saat Ini"
                    type="number"
                    value={donutValue}
                    onChange={(e) => setDonutValue(Number(e.target.value) || 0)}
                  />
                  <Input
                    label="Batas Maksimum (100% Target)"
                    type="number"
                    value={donutMax}
                    onChange={(e) => setDonutMax(Number(e.target.value) || 100)}
                  />
                  <Input
                    label="Keterangan Subjudul"
                    value={donutSubtitle}
                    onChange={(e) => setDonutSubtitle(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Live Chart Preview */}
            <div className="md:col-span-7 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Pratinjau Grafik Visual:
              </span>
              <div className="rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <PrdMetricChartViewer
                  code={generateMetricChartCode().replace(/```chart\n|```/g, '')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-stone-200 pt-3 dark:border-stone-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleApply}
            data-testid="apply-studio-to-prd-button"
            className="bg-[#166534] text-white hover:bg-[#14532d] dark:bg-[#B1E743] dark:text-[#141413] dark:hover:bg-[#9dd136]"
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            <span>Terapkan ke PRD</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
