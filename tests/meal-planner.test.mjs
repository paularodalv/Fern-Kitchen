import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateDatabase } from '../database/migrations.ts';
import { MealPlanRepository } from '../database/repositories/MealPlanRepository.ts';
import { RecipeRepository } from '../database/repositories/RecipeRepository.ts';
import { ShoppingListRepository } from '../database/repositories/ShoppingListRepository.ts';
import { addDays, getMonthCalendarDays, getWeekDates, getWeekStartDate, navigateMonth } from '../features/meal-planner/calendar.ts';
import { aggregateShoppingIngredients, generateShoppingListForWeek } from '../features/meal-planner/shopping-list.ts';

function createDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  const database = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, ...params) => {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (callback) => {
      sqlite.exec('BEGIN');
      try { await callback(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { sqlite, database };
}

function uuidSequence() {
  let value = 1;
  return () => `20000000-0000-4000-8000-${String(value++).padStart(12, '0')}`;
}

const recipeDraft = (overrides = {}) => ({
  userId: null, title: 'Crema de calabaza', description: 'Suave y casera', imageLocalUri: null,
  idealSeason: 'Otoño', category: 'Sopas', totalMinutes: 35, patienceLevel: 'Baja', baseServings: 4,
  grandmotherNotes: '', personalNotes: '',
  ingredients: [
    { name: 'Calabaza', quantity: 400, unit: 'g', optional: false },
    { name: 'Leche', quantity: 200, unit: 'ml', optional: false },
  ],
  steps: [{ title: 'Cocer', description: 'Cocer hasta ablandar.', timerMinutes: 20 }],
  ...overrides,
});

const customMeal = (overrides = {}) => ({
  date: '2026-11-09', mealType: 'lunch', entryKind: 'custom', recipeId: null,
  customMealName: 'Bocadillo de tortilla', customMealDescription: 'Con tomate',
  servings: 2, notes: 'Preparar con pan del día', ...overrides,
});

test('week dates start Monday and month navigation handles leap years', () => {
  assert.equal(getWeekStartDate('2026-11-08'), '2026-11-02');
  assert.deepEqual(getWeekDates('2026-11-08'), [
    '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
  ]);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(navigateMonth('2026-12', 1), '2027-01');
  assert.equal(navigateMonth('2027-01', -1), '2026-12');
  const leapFebruary = getMonthCalendarDays('2024-02').filter(Boolean);
  assert.equal(leapFebruary.length, 29);
  assert.equal(leapFebruary.at(-1).date, '2024-02-29');
});

test('meal plans support custom meals, linked recipes, edits, conflicts, deletion and persistence', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'fern-meal-planner-'));
  const filename = join(directory, 'meals.sqlite');
  let { sqlite, database } = createDatabase(filename);
  try {
    await migrateDatabase(database);
    const uuid = uuidSequence();
    const recipes = new RecipeRepository(database, uuid);
    const meals = new MealPlanRepository(database, uuid);
    const recipe = await recipes.create(recipeDraft());
    const linked = await meals.create({ ...customMeal({ entryKind: 'recipe', recipeId: recipe.id, customMealName: null, customMealDescription: null, notes: '' }) });
    assert.equal(linked.recipeId, recipe.id);
    assert.equal(linked.recipeTitle, 'Crema de calabaza');
    assert.equal(linked.recipeExists, true);

    const edited = await meals.update(linked.id, {
      ...customMeal({ date: '2026-11-10', mealType: 'dinner', entryKind: 'recipe', recipeId: recipe.id, customMealName: null, customMealDescription: null, servings: 5, notes: 'Sin sal' }),
    });
    assert.equal(edited.date, '2026-11-10');
    assert.equal(edited.mealType, 'dinner');
    assert.equal(edited.servings, 5);
    assert.equal(edited.notes, 'Sin sal');

    const custom = await meals.create(customMeal());
    assert.equal(custom.customMealName, 'Bocadillo de tortilla');
    const customEdit = await meals.update(custom.id, customMeal({ customMealName: 'Bocadillo vegetal' }));
    assert.equal(customEdit.customMealName, 'Bocadillo vegetal');
    await assert.rejects(meals.create(customMeal()), /Ya hay una comida planificada/);

    await recipes.update(recipe.id, recipeDraft({ title: 'Crema de otoño' }));
    assert.equal((await meals.getById(linked.id)).recipeTitle, 'Crema de otoño');
    await recipes.delete(recipe.id);
    const orphaned = await meals.getById(linked.id);
    assert.equal(orphaned.recipeId, null);
    assert.equal(orphaned.recipeExists, false);
    assert.equal(orphaned.entryKind, 'recipe');

    sqlite.close();
    ({ sqlite, database } = createDatabase(filename));
    await migrateDatabase(database);
    const reopenedMeals = new MealPlanRepository(database, uuidSequence());
    assert.equal((await reopenedMeals.listForDate('2026-11-09')).length, 1);
    assert.equal((await reopenedMeals.getById(linked.id)).recipeExists, false);
    await reopenedMeals.delete(custom.id);
    assert.equal(await reopenedMeals.getById(custom.id), null);
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM meal_plan_entries').get().total, 1);
  } finally { if (sqlite.isOpen) sqlite.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('shopping list scales, aggregates compatible units, preserves incompatible units and purchase state', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const uuid = uuidSequence();
    const recipes = new RecipeRepository(database, uuid);
    const meals = new MealPlanRepository(database, uuid);
    const shopping = new ShoppingListRepository(database, uuid);
    const soup = await recipes.create(recipeDraft());
    const bread = await recipes.create(recipeDraft({
      title: 'Tostadas', category: 'Desayuno', baseServings: 2,
      ingredients: [
        { name: 'calabaza', quantity: 0.4, unit: 'kg', optional: false },
        { name: 'Leche', quantity: 1, unit: 'l', optional: false },
        { name: 'Calabaza', quantity: 1, unit: 'pieza', optional: false },
      ],
    }));
    await meals.create({ ...customMeal({ entryKind: 'recipe', recipeId: soup.id, customMealName: null, customMealDescription: null, servings: 2 }) });
    await meals.create({ ...customMeal({ mealType: 'dinner', entryKind: 'recipe', recipeId: bread.id, customMealName: null, customMealDescription: null, servings: 2 }) });

    const result = await generateShoppingListForWeek('2026-11-09', meals, recipes, shopping);
    const calabaza = result.filter((item) => item.normalizedName === 'calabaza');
    assert.equal(calabaza.find((item) => item.normalizedUnit === 'g').quantity, 600);
    assert.equal(calabaza.find((item) => item.normalizedUnit === 'unidad').quantity, 1);
    assert.equal(result.find((item) => item.normalizedName === 'leche').quantity, 1100);
    assert.equal(result.find((item) => item.normalizedName === 'leche').unit, 'ml');

    const persisted = await shopping.listForWeek('2026-11-09');
    const milk = persisted.find((item) => item.normalizedName === 'leche');
    await shopping.setPurchased(milk.id, true);
    await generateShoppingListForWeek('2026-11-09', meals, recipes, shopping);
    assert.equal((await shopping.listForWeek('2026-11-09')).find((item) => item.id === milk.id).isPurchased, true);
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM pantry_items').get().total, 0);
    assert.deepEqual(aggregateShoppingIngredients([
      { name: 'Sal', quantity: 1, unit: 'cda' }, { name: 'sal', quantity: 2, unit: 'cdta' },
      { name: 'sal', quantity: null, unit: null },
    ]).map((item) => [item.normalizedUnit, item.quantity, item.hasQuantity]), [
      ['cucharada', 1, true], ['cucharadita', 2, true], ['', null, false],
    ]);
  } finally { sqlite.close(); }
});
