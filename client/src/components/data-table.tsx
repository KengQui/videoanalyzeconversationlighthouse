import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ExcelData, ExcelRow } from "@shared/schema";

interface DataTableProps {
  data: ExcelData;
  onExampleClick?: (rowText: string) => void;
  examplesAvailable?: Set<string>;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable({ data, onExampleClick, examplesAvailable = new Set() }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filter out the last two columns (__EMPTY_1 and __EMPTY_2)
  const visibleHeaders = useMemo(() => {
    return data.headers.filter(header => header !== "__EMPTY_1" && header !== "__EMPTY_2");
  }, [data.headers]);

  // Check if a row has examples available based on its first column text
  const hasExample = (row: ExcelRow): boolean => {
    const firstColumnText = String(row[data.headers[0]] || "").toLowerCase();
    // Check if this row text matches any available examples
    for (const exampleKey of examplesAvailable) {
      if (firstColumnText.includes(exampleKey.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.rows;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = String(aVal).localeCompare(String(bVal), undefined, {
          numeric: true,
        });
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data.rows, searchTerm, sortColumn, sortDirection]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search framework content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedData.length} {filteredAndSortedData.length === 1 ? "row" : "rows"}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <tr>
                <th className="text-left px-3 py-3 font-semibold text-sm border-b w-12">
                  {/* Empty header for examples column */}
                </th>
                {visibleHeaders.map((header, idx) => (
                  <th
                    key={idx}
                    className="text-left px-4 py-3 font-semibold text-sm border-b"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent gap-1 font-semibold"
                      onClick={() => handleSort(header)}
                      data-testid={`button-sort-${header}`}
                    >
                      {header}
                      {sortColumn === header ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b last:border-b-0 hover-elevate"
                    data-testid={`row-data-${rowIdx}`}
                  >
                    <td className="px-3 py-3 text-sm w-12">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${hasExample(row) ? '' : 'opacity-30 cursor-not-allowed'}`}
                        onClick={() => {
                          if (hasExample(row) && onExampleClick) {
                            onExampleClick(String(row[data.headers[0]] || ""));
                          }
                        }}
                        disabled={!hasExample(row)}
                        data-testid={`button-example-${rowIdx}`}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </td>
                    {visibleHeaders.map((header, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-4 py-3 text-sm font-mono"
                        data-testid={`cell-${rowIdx}-${colIdx}`}
                      >
                        {String(row[header] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={visibleHeaders.length + 1}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
