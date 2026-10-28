'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ALL_INVESTMENT_NODES,
  INVESTMENT_REGION_GROUPS,
  findInvestmentNode,
  getEffectiveNodeBenchmarks,
  InvestmentNode,
  EffectiveNodeBenchmarks,
} from '@/lib/constants/investmentNodes';
import { CustomNodeBenchmarkOverride, SouthAfricanProvince } from '@/types';
import {
  Sliders,
  RotateCcw,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Edit3,
} from 'lucide-react';

const SA_PROVINCES: (SouthAfricanProvince | 'All')[] = [
  'All',
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

interface NodeBenchmarkEditorProps {
  customNodeBenchmarks: Record<string, CustomNodeBenchmarkOverride>;
  onChange: (updated: Record<string, CustomNodeBenchmarkOverride>) => void;
}

export default function NodeBenchmarkEditor({
  customNodeBenchmarks,
  onChange,
}: NodeBenchmarkEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<SouthAfricanProvince | 'All'>('All');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputCsvRef = useRef<HTMLInputElement>(null);
  const fileInputJsonRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return ALL_INVESTMENT_NODES.filter((node) => {
      const matchesProv = selectedProvince === 'All' || node.province === selectedProvince;
      if (!matchesProv) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        node.id.toLowerCase().includes(q) ||
        node.regionGroup.toLowerCase().includes(q) ||
        node.primaryInvestmentProfile.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedProvince]);

  // Total customized count
  const customCount = useMemo(() => {
    return Object.keys(customNodeBenchmarks || {}).filter((k) => {
      const ov = customNodeBenchmarks[k];
      return ov && Object.keys(ov).some((key) => key !== 'updatedAt' && (ov as any)[key] !== undefined);
    }).length;
  }, [customNodeBenchmarks]);

  // Update a single node override
  const handleUpdateNode = (nodeId: string, updates: Partial<CustomNodeBenchmarkOverride>) => {
    const existing = customNodeBenchmarks[nodeId] || {};
    const updatedOverride: CustomNodeBenchmarkOverride = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If centsInRandAnnual is supplied, derive typicalMonthlyRatesPercentOfVal with 6 decimals
    if (typeof updates.centsInRandAnnual === 'number') {
      updatedOverride.typicalMonthlyRatesPercentOfVal = Number(
        (updates.centsInRandAnnual / 12).toFixed(6)
      );
    }

    const nextState = {
      ...customNodeBenchmarks,
      [nodeId]: updatedOverride,
    };
    onChange(nextState);
  };

  // Reset a single node to industry baseline
  const handleResetNode = (nodeId: string, nodeName: string) => {
    if (!customNodeBenchmarks[nodeId]) return;
    const nextState = { ...customNodeBenchmarks };
    delete nextState[nodeId];
    onChange(nextState);
    showNotification(`Reset ${nodeName} to SA Industry Baseline.`);
  };

  // Reset all nodes to industry baseline
  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset all 35 Regional Node Overrides to SA Industry Baselines?')) {
      onChange({});
      showNotification('All 35 Regional Nodes reset to SA Industry Baselines.');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Node ID',
      'Node Name',
      'Province',
      'Min Gross Yield %',
      'Max Gross Yield %',
      'Typical Vacancy %',
      'Typical Capital Growth %',
      'Min Price/m²',
      'Max Price/m²',
      'Annual Rates (cents in R)',
      'Data Source',
      'As-Of Date',
      'Status',
    ];

    const rows = ALL_INVESTMENT_NODES.map((node) => {
      const effective = getEffectiveNodeBenchmarks(node, customNodeBenchmarks)!;
      const override = customNodeBenchmarks[node.id];
      // Guardrail 2: Read exact user entered centsInRandAnnual with fallback to derived 4 decimal tariff
      const cents =
        override?.centsInRandAnnual ??
        Number((effective.typicalMonthlyRatesPercentOfVal * 12).toFixed(4));

      return [
        `"${node.id}"`,
        `"${node.name.replace(/"/g, '""')}"`,
        `"${node.province}"`,
        effective.grossYieldRangePercent[0],
        effective.grossYieldRangePercent[1],
        effective.typicalVacancyPercent,
        effective.typicalCapitalGrowthPercent,
        effective.pricePerSqmRangeZAR[0],
        effective.pricePerSqmRangeZAR[1],
        cents,
        `"${(effective.source || '').replace(/"/g, '""')}"`,
        `"${effective.asOfDate || ''}"`,
        `"${effective.provenance === 'custom_verified' ? 'Custom / Verified' : 'Industry Baseline'}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sa_node_market_benchmarks_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Exported 35 corridors to CSV.');
  };

  // CSV Import
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File is empty.');

        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV must contain a header and at least one data row.');

        // Simple CSV splitter handling quoted cells
        const parseLine = (line: string): string[] => {
          const cells: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              cells.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cells.push(current.trim());
          return cells;
        };

        const headerCells = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const idIdx = headerCells.findIndex((h) => h.includes('nodeid') || h === 'id');
        const nameIdx = headerCells.findIndex((h) => h.includes('nodename') || h === 'name');
        const minYieldIdx = headerCells.findIndex((h) => h.includes('mingrossyield') || h.includes('minyield'));
        const maxYieldIdx = headerCells.findIndex((h) => h.includes('maxgrossyield') || h.includes('maxyield'));
        const vacIdx = headerCells.findIndex((h) => h.includes('typicalvacancy') || h.includes('vacancy'));
        const growthIdx = headerCells.findIndex((h) => h.includes('typicalcapitalgrowth') || h.includes('growth'));
        const minSqmIdx = headerCells.findIndex((h) => h.includes('minprice') || h.includes('minsqm'));
        const maxSqmIdx = headerCells.findIndex((h) => h.includes('maxprice') || h.includes('maxsqm'));
        const ratesIdx = headerCells.findIndex((h) => h.includes('annualrates') || h.includes('centsinr') || h.includes('rates'));
        const sourceIdx = headerCells.findIndex((h) => h.includes('source'));
        const asOfIdx = headerCells.findIndex((h) => h.includes('asof') || h.includes('date'));

        const nextState = { ...customNodeBenchmarks };
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cells = parseLine(lines[i]);
          const rawId = idIdx >= 0 ? cells[idIdx] : '';
          const rawName = nameIdx >= 0 ? cells[nameIdx] : '';

          const node = findInvestmentNode(rawId) || findInvestmentNode(rawName);
          if (!node) continue;

          const override: CustomNodeBenchmarkOverride = { ...(nextState[node.id] || {}) };
          let changed = false;

          const minYield = minYieldIdx >= 0 && cells[minYieldIdx] ? parseFloat(cells[minYieldIdx]) : NaN;
          const maxYield = maxYieldIdx >= 0 && cells[maxYieldIdx] ? parseFloat(cells[maxYieldIdx]) : NaN;
          if (!isNaN(minYield) && !isNaN(maxYield) && minYield > 0 && maxYield >= minYield) {
            override.grossYieldRangePercent = [minYield, maxYield];
            changed = true;
          }

          const vac = vacIdx >= 0 && cells[vacIdx] ? parseFloat(cells[vacIdx]) : NaN;
          if (!isNaN(vac) && vac >= 0) {
            override.typicalVacancyPercent = vac;
            changed = true;
          }

          const growth = growthIdx >= 0 && cells[growthIdx] ? parseFloat(cells[growthIdx]) : NaN;
          if (!isNaN(growth)) {
            override.typicalCapitalGrowthPercent = growth;
            changed = true;
          }

          const minSqm = minSqmIdx >= 0 && cells[minSqmIdx] ? parseFloat(cells[minSqmIdx]) : NaN;
          const maxSqm = maxSqmIdx >= 0 && cells[maxSqmIdx] ? parseFloat(cells[maxSqmIdx]) : NaN;
          if (!isNaN(minSqm) && !isNaN(maxSqm) && minSqm > 0 && maxSqm >= minSqm) {
            override.pricePerSqmRangeZAR = [minSqm, maxSqm];
            changed = true;
          }

          const rates = ratesIdx >= 0 && cells[ratesIdx] ? parseFloat(cells[ratesIdx]) : NaN;
          if (!isNaN(rates) && rates > 0) {
            // Guardrail 2: Store both centsInRandAnnual and derived typicalMonthlyRatesPercentOfVal
            override.centsInRandAnnual = rates;
            override.typicalMonthlyRatesPercentOfVal = Number((rates / 12).toFixed(6));
            changed = true;
          }

          if (sourceIdx >= 0 && cells[sourceIdx]) {
            override.source = cells[sourceIdx];
            changed = true;
          }

          if (asOfIdx >= 0 && cells[asOfIdx]) {
            override.asOfDate = cells[asOfIdx];
            changed = true;
          }

          if (changed) {
            override.updatedAt = new Date().toISOString();
            nextState[node.id] = override;
            importedCount++;
          }
        }

        if (importedCount > 0) {
          onChange(nextState);
          showNotification(`Successfully imported benchmark updates for ${importedCount} corridors.`);
        } else {
          showNotification('No matching corridors found in CSV.', 'error');
        }
      } catch (err: any) {
        showNotification(err.message || 'Failed to parse CSV.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputCsvRef.current) fileInputCsvRef.current.value = '';
  };

  // JSON Export
  const handleExportJson = () => {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      customNodeBenchmarks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sa_custom_node_benchmarks_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Exported custom benchmarks to JSON.');
  };

  // JSON Import
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const benchmarks = parsed.customNodeBenchmarks || parsed;

        if (typeof benchmarks !== 'object' || benchmarks === null) {
          throw new Error('Invalid JSON structure: expected object of corridor overrides.');
        }

        const nextState = { ...customNodeBenchmarks, ...benchmarks };
        onChange(nextState);
        showNotification(`Successfully imported JSON benchmarks (${Object.keys(benchmarks).length} corridors).`);
      } catch (err: any) {
        showNotification(err.message || 'Failed to parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputJsonRef.current) fileInputJsonRef.current.value = '';
  };

  return (
    <div id="settings-node-benchmarks" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">Regional Node Market Benchmarks (35 SA Corridors)</h2>
              <span className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {customCount > 0 ? `${customCount} Custom Overrides Active` : 'All 35 Baseline Aligned'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Customize gross yields, vacancy rates, capital growth, m² ranges, and municipal tariffs for South Africa&apos;s key investment hubs. Overrides immediately power the Opportunity Analyzer and Deal Evaluators.
            </p>
          </div>
        </div>

        {/* Action Buttons: Import / Export / Reset All */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <input
            type="file"
            ref={fileInputCsvRef}
            onChange={handleImportCsv}
            accept=".csv,text/csv"
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputJsonRef}
            onChange={handleImportJson}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            type="button"
            data-testid="export-benchmarks-csv-btn"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Download complete 35-corridor benchmarks table as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            data-testid="import-benchmarks-csv-btn"
            onClick={() => fileInputCsvRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Upload CSV to update regional benchmarks in bulk"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            data-testid="export-benchmarks-json-btn"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Export JSON backup of customized benchmarks"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            data-testid="import-benchmarks-json-btn"
            onClick={() => fileInputJsonRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Import JSON backup"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Restore JSON</span>
          </button>

          {customCount > 0 && (
            <button
              type="button"
              data-testid="reset-all-benchmarks-btn"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Reset all corridors to default SA baselines"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          data-testid="node-benchmark-notification"
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 35 corridors by name, ID, or keywords (e.g. 'Sandton', 'Durban North', 'student')..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-[11px] font-semibold text-slate-600 shrink-0">Province:</label>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value as any)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-slate-800 w-full sm:w-auto"
          >
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Corridors List / Table */}
      <div className="space-y-3 pt-2">
        {filteredNodes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            No regional corridors match your search query &quot;{searchQuery}&quot;.
          </div>
        ) : (
          filteredNodes.map((node) => {
            const effective = getEffectiveNodeBenchmarks(node, customNodeBenchmarks)!;
            const override = customNodeBenchmarks[node.id];
            const isOverridden = effective.isOverridden;
            const isExpanded = expandedNodeId === node.id;

            // Guardrail 2: Read exact user entered centsInRandAnnual with fallback
            const currentCentsInRand =
              override?.centsInRandAnnual ??
              Number((effective.typicalMonthlyRatesPercentOfVal * 12).toFixed(4));

            return (
              <div
                key={node.id}
                data-testid={`node-card-${node.id}`}
                className={`rounded-xl border transition-all ${
                  isOverridden
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Node Summary Row */}
                <div
                  className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 mt-0.5 shrink-0">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{node.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {node.id}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          • {node.province}
                        </span>

                        {/* Provenance Badge */}
                        {isOverridden ? (
                          <span
                            data-testid={`node-provenance-${node.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            <span>
                              Custom / Verified
                              {effective.source ? ` · ${effective.source}` : ''}
                              {effective.asOfDate ? ` · ${effective.asOfDate}` : ''}
                            </span>
                          </span>
                        ) : (
                          <span
                            data-testid={`node-provenance-${node.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"
                          >
                            <span>Indicative estimate — unverified</span>
                          </span>
                        )}
                      </div>

                      {/* Quick Snapshot Strip */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600 font-mono">
                        <span>Yield: <strong className="text-slate-800">{effective.grossYieldRangePercent[0]}–{effective.grossYieldRangePercent[1]}%</strong></span>
                        <span>•</span>
                        <span>Vacancy: <strong className="text-slate-800">{effective.typicalVacancyPercent}%</strong></span>
                        <span>•</span>
                        <span>Growth: <strong className="text-slate-800">{effective.typicalCapitalGrowthPercent}%</strong></span>
                        <span>•</span>
                        <span>R/m²: <strong className="text-slate-800">R{effective.pricePerSqmRangeZAR[0].toLocaleString('en-ZA')}–R{effective.pricePerSqmRangeZAR[1].toLocaleString('en-ZA')}</strong></span>
                        <span>•</span>
                        <span>Tariff: <strong className="text-slate-800">{currentCentsInRand}c</strong> in R</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                    {isOverridden && (
                      <button
                        type="button"
                        data-testid={`reset-node-${node.id}-btn`}
                        onClick={() => handleResetNode(node.id, node.name)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 px-2 py-1 rounded transition-colors cursor-pointer"
                        title="Reset this node to industry baseline"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400 group-hover:text-rose-600" />
                        <span>Reset Node</span>
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid={`toggle-expand-${node.id}-btn`}
                      onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Benchmark Editor Panel */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
                    <div className="text-[11px] text-slate-500 italic">
                      {node.primaryInvestmentProfile}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {/* 1. Gross Yield Range % */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Gross Yield Range (%)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            data-testid={`input-min-yield-${node.id}`}
                            value={effective.grossYieldRangePercent[0]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleUpdateNode(node.id, {
                                grossYieldRangePercent: [val, effective.grossYieldRangePercent[1]],
                              });
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                            placeholder="Min %"
                          />
                          <span className="text-slate-400 font-bold">–</span>
                          <input
                            type="number"
                            step="0.1"
                            data-testid={`input-max-yield-${node.id}`}
                            value={effective.grossYieldRangePercent[1]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleUpdateNode(node.id, {
                                grossYieldRangePercent: [effective.grossYieldRangePercent[0], val],
                              });
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                            placeholder="Max %"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">Baseline: {node.benchmarks.grossYieldRangePercent[0]}–{node.benchmarks.grossYieldRangePercent[1]}%</span>
                      </div>

                      {/* 2. Typical Vacancy % */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Typical Vacancy (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          data-testid={`input-vacancy-${node.id}`}
                          value={effective.typicalVacancyPercent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateNode(node.id, { typicalVacancyPercent: val });
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                        />
                        <span className="text-[10px] text-slate-400">Baseline: {node.benchmarks.typicalVacancyPercent}%</span>
                      </div>

                      {/* 3. Typical Capital Growth % */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Capital Growth (% p.a.)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          data-testid={`input-growth-${node.id}`}
                          value={effective.typicalCapitalGrowthPercent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateNode(node.id, { typicalCapitalGrowthPercent: val });
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                        />
                        <span className="text-[10px] text-slate-400">Baseline: {node.benchmarks.typicalCapitalGrowthPercent}%</span>
                      </div>

                      {/* 4. Municipal Rates (cents in the Rand annual) */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Rates Tariff (c in R)
                          </label>
                          <span className="text-[10px] text-indigo-600 font-mono" title="Monthly rates as % of valuation">
                            ~{(effective.typicalMonthlyRatesPercentOfVal).toFixed(4)}%/mo
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          data-testid={`input-rates-cents-${node.id}`}
                          value={currentCentsInRand}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateNode(node.id, { centsInRandAnnual: val });
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                          placeholder="e.g. 0.85"
                        />
                        <span className="text-[10px] text-slate-400">
                          Baseline: {(node.benchmarks.typicalMonthlyRatesPercentOfVal * 12).toFixed(2)}c in R
                        </span>
                      </div>

                      {/* 5. Price per m² Range ZAR */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Price per m² Range (ZAR)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="500"
                            data-testid={`input-min-sqm-${node.id}`}
                            value={effective.pricePerSqmRangeZAR[0]}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              handleUpdateNode(node.id, {
                                pricePerSqmRangeZAR: [val, effective.pricePerSqmRangeZAR[1]],
                              });
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                            placeholder="Min R/m²"
                          />
                          <span className="text-slate-400 font-bold">–</span>
                          <input
                            type="number"
                            step="500"
                            data-testid={`input-max-sqm-${node.id}`}
                            value={effective.pricePerSqmRangeZAR[1]}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              handleUpdateNode(node.id, {
                                pricePerSqmRangeZAR: [effective.pricePerSqmRangeZAR[0], val],
                              });
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                            placeholder="Max R/m²"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Baseline: R{node.benchmarks.pricePerSqmRangeZAR[0].toLocaleString('en-ZA')}–R{node.benchmarks.pricePerSqmRangeZAR[1].toLocaleString('en-ZA')}/m²
                        </span>
                      </div>

                      {/* 6. Provenance & Transparency Metadata */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Data Provenance &amp; Verification Note
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            data-testid={`input-source-${node.id}`}
                            value={override?.source || ''}
                            onChange={(e) => handleUpdateNode(node.id, { source: e.target.value })}
                            placeholder="Source (e.g. TPN Q3 2026, Lightstone)"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                          <input
                            type="text"
                            data-testid={`input-as-of-${node.id}`}
                            value={override?.asOfDate || ''}
                            onChange={(e) => handleUpdateNode(node.id, { asOfDate: e.target.value })}
                            placeholder="As-Of Date (e.g. 2026-10)"
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Displayed on the Buy-Box guardrail badges and lender proposal tear-sheets.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
