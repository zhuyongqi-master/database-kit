import { Button } from "@shadcn/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shadcn/components/ui/table";
import { Edit, Lock } from "lucide-react";
import React, { useState } from "react";

export interface Row {
  key: string;
  value: string | number;
}

export interface Column {
  header: string | ((rowIndex: number, isConfigurable: boolean) => React.ReactNode);
  cell: string | ((row: Row, romIndex: number, isConfigurable: boolean) => React.ReactNode);
}

interface DataTableProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  title: string;
  columns: Column[];
  rows: Row[];
  onConfigFinished?: () => void;
}

export default function DataTable({ title, columns, rows, onConfigFinished, className, ...props }: DataTableProps) {
  const [isConfigurable, setIsConfigurable] = useState(false);

  const toggleConfigurable = () => {
    if (isConfigurable && onConfigFinished) {
      onConfigFinished();
    }
    setIsConfigurable(!isConfigurable);
  };

  return (
    <div className={`w-full mx-auto ${className || ""}`} {...props}>
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xs font-medium">{title}</h2>
        <Button
          variant={isConfigurable ? "default" : "outline"}
          size="icon"
          onClick={toggleConfigurable}
          aria-label={isConfigurable ? "Lock configuration" : "Edit configuration"}
          className="h-6 w-6"
        >
          {isConfigurable ? <Lock className="h-3.5 w-3.5"/> : <Edit className="h-3.5 w-3.5"/>}
        </Button>
      </div>
      <div className="border rounded-sm overflow-hidden">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="bg-gray-50">
              {columns.map((column, index) => {
                if (typeof column.header === "string") {
                  return <TableHead key={index} className="h-7 py-1 text-xs font-medium">{column.header}</TableHead>;
                } else if (typeof column.header === "function") {
                  return <TableHead key={index} className="h-7 py-1">{column.header(index, isConfigurable)}</TableHead>;
                } else {
                  return <TableHead key={index} className="h-7 py-1">{"Invalid Header"}</TableHead>;
                }
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.key} className="text-xs">
                {columns.map((column, index) => {
                  if (typeof column.cell === "string") {
                    return (
                      <TableCell className="font-medium w-1/3 py-1 px-2" key={index}>
                        {column.cell}
                      </TableCell>
                    );
                  } else if (typeof column.cell === "function") {
                    return (
                      <TableCell className="w-2/3 py-1 px-2" key={index}>
                        {column.cell(row, rowIndex, isConfigurable)}
                      </TableCell>
                    );
                  } else {
                    return <TableCell key={index}>{"Invalid Header"}</TableCell>;
                  }
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
