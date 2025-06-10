/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="node" />

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number
    absoluteStrokeWidth?: boolean
  }
  export type Icon = FC<IconProps>
  export const Search: Icon
  export const User: Icon
  export const Loader2: Icon
  export const Clock: Icon
  export const MapPin: Icon
  export const Check: Icon
  export const X: Icon
  export const ChevronLeft: Icon
  export const ChevronRight: Icon
}

declare module '@supabase/auth-helpers-nextjs' {
  import { SupabaseClient } from '@supabase/supabase-js'
  export function createClientComponentClient(): SupabaseClient
  export function createServerComponentClient(): SupabaseClient
  export function createRouteHandlerClient(): SupabaseClient
}

declare module '@supabase/supabase-js' {
  export interface RealtimePostgresChangesPayload<T = any> {
    schema: string
    table: string
    commit_timestamp: string
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: T
    old: T
    errors: null | any[]
  }
  
  export interface SupabaseClient {
    auth: {
      getSession(): Promise<{ data: { session: any } | null }>
      signOut(): Promise<{ error: any }>
    }
    from(table: string): any
  }
} 