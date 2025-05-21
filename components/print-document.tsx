"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintDocument() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Button
      onClick={handlePrint}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 print:hidden"
      aria-label="Print this document"
    >
      <Printer className="h-4 w-4" />
      <span>Print</span>
    </Button>
  )
}
