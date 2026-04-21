'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Badge,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose,
  Label, Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

interface Client {
  id: string;
  name: string;
  status: string;
}

interface ClientAssignment {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  role: string | null;
  client: Client;
}

interface Props {
  employeeId: string;
  organizationId: string;
  assignments: ClientAssignment[];
  availableClients: Client[];
}

// ============================================================================
// CLIENT ASSIGNMENT SECTION COMPONENT
// ============================================================================

export function ClientAssignmentSection({ employeeId, organizationId, assignments, availableClients }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const activeAssignments = assignments.filter(a => a.status === 'active');

  // Clients not already assigned
  const unassignedClients = availableClients.filter(
    client => !activeAssignments.some(a => a.client_id === client.id)
  );

  const handleAssign = async () => {
    if (!selectedClientId) {
      setError('Please select a client');
      return;
    }

    setError(null);
    const supabase = createClient();

    const { error: insertError } = await supabase
      .from('client_assignments')
      .insert({
        organization_id: organizationId,
        employee_id: employeeId,
        client_id: selectedClientId,
        role: role || null,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOpen(false);
    setSelectedClientId('');
    setRole('');
    startTransition(() => {
      router.refresh();
    });
  };

  const handleRemove = async (assignmentId: string) => {
    const supabase = createClient();

    await supabase
      .from('client_assignments')
      .update({ status: 'inactive', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', assignmentId);

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Client Assignments</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={unassignedClients.length === 0}>
              Assign Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign to Client</DialogTitle>
              <DialogDescription>
                Select a client to assign this employee to.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role (optional)</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Rider</SelectItem>
                    <SelectItem value="backup">Backup Rider</SelectItem>
                    <SelectItem value="dedicated">Dedicated</SelectItem>
                    <SelectItem value="floater">Floater</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAssign} disabled={isPending || !selectedClientId}>
                {isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {activeAssignments.length > 0 ? (
          <div className="space-y-3">
            {activeAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-heading">{assignment.client?.name || 'Unknown Client'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {assignment.role && (
                        <Badge variant="outline" className="text-xs">
                          {assignment.role}
                        </Badge>
                      )}
                      <span className="text-xs text-muted">
                        Since {new Date(assignment.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemove(assignment.id)}
                  disabled={isPending}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted">
            <svg className="h-10 w-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm">No clients assigned yet</p>
            <p className="text-xs mt-1">Click "Assign Client" to add this employee to a client</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
