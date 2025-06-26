/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="node" />

// React JSX Runtime
declare module 'react/jsx-runtime' {
  export * from 'react'
}

declare module 'react/jsx-dev-runtime' {
  export * from 'react'
}

// Next.js modules
declare module 'next/navigation' {
  export function useRouter(): {
    push: (url: string) => void
    replace: (url: string) => void
    back: () => void
    forward: () => void
    refresh: () => void
  }
  export function useSearchParams(): URLSearchParams
  export function usePathname(): string
}

declare module 'next/link' {
  import React from 'react'
  interface LinkProps {
    href: string
    as?: string
    replace?: boolean
    scroll?: boolean
    shallow?: boolean
    passHref?: boolean
    prefetch?: boolean
    locale?: string | false
    legacyBehavior?: boolean
    children?: React.ReactNode
    className?: string
  }
  const Link: React.FC<LinkProps>
  export default Link
}

// Extend global namespace for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL?: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
      NODE_ENV: 'development' | 'production' | 'test'
    }
  }
  
  // JSX namespace
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

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
