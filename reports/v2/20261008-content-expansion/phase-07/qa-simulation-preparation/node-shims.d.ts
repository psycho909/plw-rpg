/** Minimal Node declarations for this isolated runner typecheck; no production/package types are supplied. */
declare const process: { cwd(): string; env: Record<string, string | undefined> }
declare class Buffer extends Uint8Array {
  static byteLength(value: string | Buffer): number
}

declare module 'node:crypto' {
  export function createHash(algorithm: string): {
    update(value: string | Buffer): { digest(encoding: 'hex'): string }
    digest(encoding: 'hex'): string
  }
}
declare module 'node:fs' {
  export function appendFileSync(path: string, data: string, options: { encoding: string; flag: string }): void
  export function mkdirSync(path: string, options: { recursive: boolean }): void
  export function readFileSync(path: string): Buffer
  export function readdirSync(path: string, options: { withFileTypes: true }): Array<{
    name: string; isDirectory(): boolean; isFile(): boolean; isSymbolicLink(): boolean
  }>
  export function statSync(path: string): { isFile(): boolean }
  export function writeFileSync(path: string, data: string, options: { flag: string }): void
}
declare module 'node:child_process' {
  export function execFileSync(file: string, args: string[], options: { cwd: string; encoding: string }): string
}
declare module 'node:path' {
  export const sep: string
  export function join(...paths: string[]): string
  export function relative(from: string, to: string): string
}
