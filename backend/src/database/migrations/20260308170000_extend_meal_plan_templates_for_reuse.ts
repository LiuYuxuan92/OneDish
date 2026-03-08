import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasFamilyId = await knex.schema.hasColumn('meal_plan_templates', 'family_id');
  if (!hasFamilyId) {
    await knex.schema.alterTable('meal_plan_templates', (table) => {
      table.string('family_id').nullable().references('id').inTable('families').onDelete('SET NULL').index();
    });
  }

  const hasAgeStart = await knex.schema.hasColumn('meal_plan_templates', 'baby_age_start_months');
  if (hasAgeStart) {
    await knex.schema.alterTable('meal_plan_templates', (table) => {
      table.dropColumn('baby_age_start_months');
    });
  }

  const hasAgeEnd = await knex.schema.hasColumn('meal_plan_templates', 'baby_age_end_months');
  if (hasAgeEnd) {
    await knex.schema.alterTable('meal_plan_templates', (table) => {
      table.dropColumn('baby_age_end_months');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasFamilyId = await knex.schema.hasColumn('meal_plan_templates', 'family_id');
  if (hasFamilyId) {
    await knex.schema.alterTable('meal_plan_templates', (table) => {
      table.dropColumn('family_id');
    });
  }

  const hasAgeStart = await knex.schema.hasColumn('meal_plan_templates', 'baby_age_start_months');
  if (!hasAgeStart) {
    await knex.schema.alterTable('meal_plan_templates', (table) => {
      table.integer('baby_age_start_months');
    });
  }

  const hasAgeEnd = await knex.schema.hasColumn('meal_plan_templates', 'baby_age_end_months');
  if (!hasAgeEnd) {
    await knex.schema.alterTable('meal_plan_templates', (table) => {
      table.integer('baby_age_end_months');
    });
  }
}
