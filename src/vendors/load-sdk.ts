export type Importer = (specifier: string) => Promise<unknown>

/**
 * Loads a vendor SDK by bare specifier. Each SDK is an optional peer
 * dependency: probity ships without any of them installed, and only the
 * SDK for the vendor actually in use needs to be present. `importer` is
 * injectable for testing; it defaults to a real dynamic import.
 *
 * A missing vendor SDK is a hard precondition — unlike the ast-grep
 * language packs (which fall through to the AI fast-path when absent),
 * the selected agent literally cannot run without its SDK. So a missing
 * module surfaces as a clear, actionable error instead of degrading
 * silently. Any other error (including a *transitive* missing-module
 * error thrown from inside an SDK that IS installed) must re-throw
 * untouched — see `isModuleNotFound` below.
 */
export async function loadSdk<T = unknown>(
  specifier: string,
  importer: Importer = (s) => import(s),
): Promise<T> {
  try {
    return (await importer(specifier)) as T
  } catch (error) {
    if (isModuleNotFound(error, specifier)) {
      throw new Error(
        `Cannot find "${specifier}" — it's an optional peer dependency ` +
          `of probity. Install it with \`npm install -D ${specifier}\`.`,
      )
    }
    throw error
  }
}

// Node sets `error.code === 'ERR_MODULE_NOT_FOUND'` both when `specifier`
// itself is missing AND when something inside an already-installed SDK
// fails to resolve one of its own deep imports. Node's message for the
// first case names the exact specifier that was requested; a transitive
// failure names some other module path instead. Cross-checking the
// message against `specifier` is what tells the two apart.
function isModuleNotFound(error: unknown, specifier: string): boolean {
  if (!(error instanceof Error)) return false
  if ((error as { code?: string }).code !== 'ERR_MODULE_NOT_FOUND') return false
  return error.message.includes(specifier)
}
