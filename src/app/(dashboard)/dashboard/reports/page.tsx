'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Input } from '@/components/ui';

type ReportType = {
  id: string;
  name: string;
  description: string;
  category: 'operations' | 'finance' | 'hr' | 'compliance';
  params: Array<{
    key: string;
    label: string;
    type: 'date' | 'select' | 'text';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
};

const REPORT_TYPES: ReportType[] = [
  {
    id: 'daily_orders',
    name: 'Daily Orders Report',
    description: 'Summary of orders by date range with delivery metrics',
    category: 'operations',
    params: [
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
    ],
  },
  {
    id: 'driver_performance',
    name: 'Driver Performance Report',
    description: "Individual driver performance metrics including delivery count, ratings, and incidents",
    category: 'operations',
    params: [
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
      {
        key: 'employee_status',
        label: 'Employee Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Employees' },
          { value: 'active', label: 'Active Only' },
          { value: 'inactive', label: 'Inactive Only' },
        ],
      },
    ],
  },
  {
    id: 'platform_revenue',
    name: 'Platform Revenue Report',
    description: 'Revenue breakdown by platform with COD and commission details',
    category: 'finance',
    params: [
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
    ],
  },
  {
    id: 'payroll_summary',
    name: 'Payroll Summary Report',
    description: 'Comprehensive payroll breakdown by employee and department',
    category: 'finance',
    params: [
      { key: 'month', label: 'Month', type: 'date', required: true },
      {
        key: 'department',
        label: 'Department',
        type: 'select',
        options: [
          { value: 'all', label: 'All Departments' },
          { value: 'delivery', label: 'Delivery' },
          { value: 'warehouse', label: 'Warehouse' },
          { value: 'admin', label: 'Admin' },
        ],
      },
    ],
  },
  {
    id: 'cod_reconciliation',
    name: 'COD Reconciliation Report',
    description: 'Cash on delivery collection vs remittance reconciliation',
    category: 'finance',
    params: [
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
    ],
  },
  {
    id: 'employee_roster',
    name: 'Employee Roster Report',
    description: 'Complete employee list with documents and visa status',
    category: 'hr',
    params: [
      {
        key: 'status',
        label: 'Employment Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'terminated', label: 'Terminated' },
          { value: 'on_leave', label: 'On Leave' },
        ],
      },
    ],
  },
  {
    id: 'document_expiry',
    name: 'Document Expiry Report',
    description: 'Documents expiring within specified timeframe',
    category: 'compliance',
    params: [
      {
        key: 'days_ahead',
        label: 'Days Ahead',
        type: 'select',
        options: [
          { value: '30', label: '30 Days' },
          { value: '60', label: '60 Days' },
          { value: '90', label: '90 Days' },
        ],
      },
      {
        key: 'doc_type',
        label: 'Document Type',
        type: 'select',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'visa', label: 'Visa' },
          { value: 'emirates_id', label: 'Emirates ID' },
          { value: 'driving_license', label: 'Driving License' },
          { value: 'vehicle_registration', label: 'Vehicle Registration' },
        ],
      },
    ],
  },
  {
    id: 'incident_summary',
    name: 'Incident Summary Report',
    description: 'Summary of incidents by type, severity, and status',
    category: 'compliance',
    params: [
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
    ],
  },
  {
    id: 'vehicle_utilization',
    name: 'Vehicle Utilization Report',
    description: 'Vehicle usage metrics including mileage, maintenance, and assignments',
    category: 'operations',
    params: [
      { key: 'start_date', label: 'Start Date', type: 'date', required: true },
      { key: 'end_date', label: 'End Date', type: 'date', required: true },
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  operations: 'Operations',
  finance: 'Finance',
  hr: 'Human Resources',
  compliance: 'Compliance',
};

const CATEGORY_COLORS: Record<string, string> = {
  operations: 'bg-blue-100 text-blue-800',
  finance: 'bg-green-100 text-green-800',
  hr: 'bg-purple-100 text-purple-800',
  compliance: 'bg-orange-100 text-orange-800',
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredReports =
    filterCategory === 'all'
      ? REPORT_TYPES
      : REPORT_TYPES.filter((r) => r.category === filterCategory);

  const handleGenerateReport = async () => {
    if (!selectedReport) return;

    // Validate required fields
    const missingFields = selectedReport.params
      .filter((p) => p.required && !params[p.key])
      .map((p) => p.label);

    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setGenerating(true);

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // In a real app, this would call the backend reporting service
    // and either download a file or navigate to a report view
    alert(`Report "${selectedReport.name}" generated successfully!`);

    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Reports</h1>
        <p className="text-muted">Generate and download business reports.</p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterCategory('all')}
        >
          All Reports
        </Button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <Button
            key={key}
            variant={filterCategory === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-heading">Available Reports</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredReports.map((report) => (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all ${
                  selectedReport?.id === report.id
                    ? 'ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => {
                  setSelectedReport(report);
                  setParams({});
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-heading">{report.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[report.category]}`}
                    >
                      {CATEGORY_LABELS[report.category]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{report.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Report configuration */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>
                {selectedReport ? selectedReport.name : 'Select a Report'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedReport ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted">{selectedReport.description}</p>

                  {selectedReport.params.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h4 className="font-medium text-heading">Parameters</h4>
                      {selectedReport.params.map((param) => (
                        <div key={param.key}>
                          <Label htmlFor={param.key}>
                            {param.label}
                            {param.required && <span className="text-error ml-1">*</span>}
                          </Label>
                          {param.type === 'date' ? (
                            <Input
                              id={param.key}
                              type="date"
                              value={params[param.key] || ''}
                              onChange={(e) =>
                                setParams({ ...params, [param.key]: e.target.value })
                              }
                              className="mt-1"
                            />
                          ) : param.type === 'select' && param.options ? (
                            <select
                              id={param.key}
                              value={params[param.key] || ''}
                              onChange={(e) =>
                                setParams({ ...params, [param.key]: e.target.value })
                              }
                              className="mt-1 flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select...</option>
                              {param.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={param.key}
                              type="text"
                              value={params[param.key] || ''}
                              onChange={(e) =>
                                setParams({ ...params, [param.key]: e.target.value })
                              }
                              className="mt-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <Button
                      className="w-full"
                      onClick={handleGenerateReport}
                      disabled={generating}
                    >
                      {generating ? 'Generating...' : 'Generate Report'}
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" disabled={generating}>
                        Download PDF
                      </Button>
                      <Button variant="outline" className="flex-1" disabled={generating}>
                        Download Excel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <p>Select a report from the list to configure and generate it.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted">
            <p>No reports generated yet. Select a report above to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
