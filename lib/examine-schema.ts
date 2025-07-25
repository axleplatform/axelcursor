"use client"

import { supabase } from "./supabase"

export async function examineSchema() {
  if (!supabase) throw new Error("Supabase client is not initialized")
  
  try {
    // Get the schema of the appointments table
    const { data: appointmentsColumns, error: appointmentsError } = await (supabase as any).rpc("get_table_columns", {
      table_name: "appointments",
    })

    if (appointmentsError) {
      console.error("Error fetching appointments schema:", appointmentsError)

      // Alternative approach if RPC is not available
      const { data: appointmentsInfo, error: infoError } = await supabase.from("appointments").select("*").limit(1)

      if (infoError) {
        console.error("Error fetching sample appointment:", infoError)
        return { error: "Could not fetch schema information" }
      }

      // If we can get a sample row, we can see the column names
      if (appointmentsInfo && appointmentsInfo.length > 0) {
        const columns = Object.keys(appointmentsInfo[0])
        console.log("Appointments columns:", columns)
        return { columns }
      }
    } else {
      console.log("Appointments columns:", appointmentsColumns)
      return { columns: appointmentsColumns }
    }

    // Check for junction tables
    const { data: tables, error: tablesError } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public")

    if (tablesError) {
      console.error("Error fetching tables:", tablesError)
    } else {
      console.log("Available tables:", tables)

      // Look for potential junction tables
      const potentialJunctionTables = tables
        .map((t: { tablename: string }) => t.tablename)
        .filter(
          (name: string) =>
            (name.includes("mechanic") && name.includes("appointment")) ||
            (name.includes("technician") && name.includes("appointment")) ||
            (name.includes("provider") && name.includes("appointment")),
        )

      if (potentialJunctionTables.length > 0) {
        console.log("Potential junction tables:", potentialJunctionTables)
        return { junctionTables: potentialJunctionTables }
      }
    }

    return { error: "Could not determine schema structure" }
  } catch (error) {
    console.error("Error examining schema:", error)
    return { error: "Error examining schema" }
  }
}
