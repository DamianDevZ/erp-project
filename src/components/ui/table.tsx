import * as React from 'react';

/**
 * Table components for displaying tabular data.
 * 
 * @example
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Status</TableHead>
 *       <TableHead>Actions</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     {drivers.map((driver) => (
 *       <TableRow key={driver.id}>
 *         <TableCell>{driver.name}</TableCell>
 *         <TableCell><Badge>{driver.status}</Badge></TableCell>
 *         <TableCell><Button size="sm">Edit</Button></TableCell>
 *       </TableRow>
 *     ))}
 *   </TableBody>
 * </Table>
 */
export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className = '', ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table ref={ref} className={`w-full caption-bottom text-sm ${className}`} {...props} />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => (
    <thead ref={ref} className={`border-b border-border bg-hover ${className}`} {...props} />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className = '', ...props }, ref) => (
    <tbody ref={ref} className={`divide-y divide-border ${className}`} {...props} />
  )
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', ...props }, ref) => (
    <tr ref={ref} className={`transition-colors hover:bg-hover ${className}`} {...props} />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle font-medium text-muted ${className}`}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  currentSort: string | null;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
}

export const SortableTableHead = React.forwardRef<HTMLTableCellElement, SortableTableHeadProps>(
  ({ className = '', sortKey, currentSort, currentDirection, onSort, children, ...props }, ref) => {
    const isActive = currentSort === sortKey;
    
    return (
      <th
        ref={ref}
        className={`h-12 px-4 text-left align-middle font-medium text-muted cursor-pointer select-none hover:text-heading hover:bg-background transition-colors ${className}`}
        onClick={() => onSort(sortKey)}
        {...props}
      >
        <div className="flex items-center gap-1">
          {children}
          <span className="inline-flex flex-col ml-1">
            <svg 
              className={`h-3 w-3 -mb-1 ${isActive && currentDirection === 'asc' ? 'text-primary' : 'text-muted/40'}`} 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 5l7 7H5z" />
            </svg>
            <svg 
              className={`h-3 w-3 ${isActive && currentDirection === 'desc' ? 'text-primary' : 'text-muted/40'}`} 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 19l-7-7h14z" />
            </svg>
          </span>
        </div>
      </th>
    );
  }
);
SortableTableHead.displayName = 'SortableTableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => (
    <td ref={ref} className={`p-4 align-middle text-body ${className}`} {...props} />
  )
);
TableCell.displayName = 'TableCell';
