"use client"

import React from 'react'
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
      <span>🖨️</span>
      <span>Print</span>
    </Button>
  )
}
