import { supabase } from '../supabaseClient'

export const MAX_CATEGORIES = 10

export const CATEGORY_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#84cc16',
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

// `existingCount` is however many categories the user already has, used to
// cycle through CATEGORY_COLORS deterministically as categories are added.
export async function createCategory(userId, name, existingCount) {
  const color = CATEGORY_COLORS[existingCount % CATEGORY_COLORS.length]

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
