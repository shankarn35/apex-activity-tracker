import { supabase } from '../supabaseClient'

export const MAX_CATEGORIES = 9

export const CATEGORY_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#92400e',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#d946ef',
  '#f97316',
]

// ~15% opacity of a 6-digit hex color, for the tinted category-badge background.
export function categoryTint(hex) {
  return `${hex}26`
}

export async function fetchCategories(userId) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data
}

// Fetches the user's current categories fresh (not a count passed in from
// possibly-stale local state) and assigns the first palette color not
// already in use — keeps colors distinct even across two tabs adding a
// category around the same time, short of a genuine simultaneous race
// (which unique_category_color_per_user catches as a last resort).
export async function createCategory(userId, name) {
  const existing = await fetchCategories(userId)
  const usedColors = new Set(existing.map((c) => c.color))
  const color =
    CATEGORY_COLORS.find((c) => !usedColors.has(c)) ??
    CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length]

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name, color })
    .select()
    .single()

  if (error) throw error

  return data
}

export async function updateCategoryColor(categoryId, color) {
  const { data, error } = await supabase
    .from('categories')
    .update({ color })
    .eq('id', categoryId)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function countTasksUsingCategory(categoryId) {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if (error) throw error

  return count
}

export async function deleteCategory(categoryId) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw error
}
