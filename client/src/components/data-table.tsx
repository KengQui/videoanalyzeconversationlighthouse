import { useState, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ExcelData, ExcelRow } from "@shared/schema";

interface DataTableProps {
  data: ExcelData;
  onExampleClick?: (rowText: string) => void;
  examplesAvailable?: Set<string>;
}

export function DataTable({ data, onExampleClick, examplesAvailable = new Set() }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter out the last two columns (__EMPTY_1 and __EMPTY_2)
  const visibleHeaders = useMemo(() => {
    return data.headers.filter(header => header !== "__EMPTY_1" && header !== "__EMPTY_2");
  }, [data.headers]);

  // Check if a row is a section header (all milestone columns are empty)
  const isSectionHeader = (row: ExcelRow): boolean => {
    // Check if all columns except the first one (criteria name) are empty
    for (let i = 1; i < visibleHeaders.length; i++) {
      if (row[visibleHeaders[i]] !== "" && row[visibleHeaders[i]] !== null && row[visibleHeaders[i]] !== undefined) {
        return false;
      }
    }
    return true;
  };

  // Check if a row has examples available based on its first column text
  const hasExample = (row: ExcelRow): boolean => {
    // Section headers never have examples
    if (isSectionHeader(row)) {
      return false;
    }
    
    const firstColumnText = String(row[data.headers[0]] || "").toLowerCase();
    // Check if this row text matches any available examples
    const exampleKeys = Array.from(examplesAvailable);
    for (const exampleKey of exampleKeys) {
      if (firstColumnText.includes(exampleKey.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  const filteredData = useMemo(() => {
    let filtered = data.rows;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered;
  }, [data.rows, searchTerm]);

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
                    {header === "__EMPTY" ? "Criteria" : header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, rowIdx) => {
                  const isHeader = isSectionHeader(row);
                  return (
                    <tr
                      key={rowIdx}
                      className={`border-b last:border-b-0 ${isHeader ? 'bg-muted/50' : 'hover-elevate'}`}
                      data-testid={`row-data-${rowIdx}`}
                    >
                      <td className="px-3 py-3 text-sm w-12">
                        {!isHeader && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${hasExample(row) ? 'text-chart-2 hover:text-chart-2' : 'opacity-30 cursor-not-allowed'}`}
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
                        )}
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
                  );
                })
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
