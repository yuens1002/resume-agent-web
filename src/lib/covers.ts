/*
 * Project cover images — INTERIM client-side map.
 *
 * Hosted in the shared Supabase Storage bucket `project-covers`. This map exists
 * only until resume-agent adds an optional `cover` field to the Project schema
 * (see the handoff issue); after that, read `project.cover` from /info and delete
 * this file. Keyed by project slug — a project with no entry shows no image.
 */
export const COVERS: Record<string, string> = {
  'artisan-roast':
    'https://snvyqnnmeotratupqbua.supabase.co/storage/v1/object/public/project-covers/artisan-roast.webp',
  'artisan-roast-platform':
    'https://snvyqnnmeotratupqbua.supabase.co/storage/v1/object/public/project-covers/artisan-roast-platform.webp',
  'brew-guide':
    'https://snvyqnnmeotratupqbua.supabase.co/storage/v1/object/public/project-covers/brew-guide.webp',
}
