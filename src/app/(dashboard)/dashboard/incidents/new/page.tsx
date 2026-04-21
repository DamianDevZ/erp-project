'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, Label, Input } from '@/components/ui';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  full_name: string;
}

interface Asset {
  id: string;
  name: string;
  license_plate: string | null;
}

/**
 * Report new incident page.
 */
export default function NewIncidentPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Form state
  const [incidentType, setIncidentType] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [employeeId, setEmployeeId] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [policeReportFiled, setPoliceReportFiled] = useState<boolean>(false);
  const [policeReportNumber, setPoliceReportNumber] = useState<string>('');

  // Load employees and assets
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const [empRes, assetRes] = await Promise.all([
        supabase.from('employees').select('id, full_name').eq('status', 'active').order('full_name'),
        supabase.from('assets').select('id, name, license_plate').order('name'),
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (assetRes.data) setAssets(assetRes.data);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!incidentType || !severity) {
      setError('Please select incident type and severity');
      return;
    }

    const supabase = createClient();

    // Get organization
    const { data: firstEmp } = await supabase.from('employees').select('organization_id').limit(1).single();
    if (!firstEmp) {
      setError('No organization found');
      return;
    }

    // Generate incident number
    const incidentNumber = `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const { data, error: insertError } = await supabase
      .from('incidents')
      .insert({
        organization_id: firstEmp.organization_id,
        incident_number: incidentNumber,
        incident_type: incidentType,
        severity: severity,
        incident_date: incidentDate,
        incident_time: incidentTime,
        employee_id: employeeId || null,
        asset_id: assetId || null,
        incident_location: location || null,
        description: description || null,
        police_report_filed: policeReportFiled,
        police_report_number: policeReportNumber || null,
        status: 'open',
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    startTransition(() => {
      router.push(`/dashboard/incidents/${data.id}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Report Incident</h1>
          <p className="text-muted">Log an accident, breakdown, or other incident.</p>
        </div>
        <Link href="/dashboard/incidents">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Main details */}
          <Card>
            <CardHeader>
              <CardTitle>Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Incident Type *</Label>
                  <Select value={incidentType} onValueChange={setIncidentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accident">Accident</SelectItem>
                      <SelectItem value="breakdown">Breakdown</SelectItem>
                      <SelectItem value="theft">Theft</SelectItem>
                      <SelectItem value="vandalism">Vandalism</SelectItem>
                      <SelectItem value="damage_rider">Rider Damage</SelectItem>
                      <SelectItem value="damage_third_party">3rd Party Damage</SelectItem>
                      <SelectItem value="violation">Traffic Violation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity *</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="total">Total Loss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="incidentDate">Date *</Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incidentTime">Time</Label>
                  <Input
                    id="incidentTime"
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Al Barsha, near Mall of Emirates"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened..."
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* People & Vehicle */}
          <Card>
            <CardHeader>
              <CardTitle>People & Vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Employee Involved</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vehicle Involved</Label>
                <Select value={assetId} onValueChange={setAssetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.license_plate || asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="policeReport"
                    checked={policeReportFiled}
                    onChange={(e) => setPoliceReportFiled(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="policeReport">Police report filed</Label>
                </div>
                {policeReportFiled && (
                  <div className="space-y-2">
                    <Label htmlFor="policeReportNumber">Police Report Number</Label>
                    <Input
                      id="policeReportNumber"
                      value={policeReportNumber}
                      onChange={(e) => setPoliceReportNumber(e.target.value)}
                      placeholder="Enter report number"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Link href="/dashboard/incidents">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Report Incident'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
