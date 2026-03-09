import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. families 表新增 invite_code_expire_at 字段
  const familiesHasExpireAt = await knex.schema.hasColumn('families', 'invite_code_expire_at');
  if (!familiesHasExpireAt) {
    await knex.schema.alterTable('families', (table) => {
      table.datetime('invite_code_expire_at').nullable();
    });
  }

  // 2. feeding_feedbacks 表新增 actor_user_id 和 family_id
  const feedbackHasActor = await knex.schema.hasColumn('feeding_feedbacks', 'actor_user_id');
  if (!feedbackHasActor) {
    await knex.schema.alterTable('feeding_feedbacks', (table) => {
      table.string('actor_user_id', 36).nullable().index();
    });
  }

  const feedbackHasFamily = await knex.schema.hasColumn('feeding_feedbacks', 'family_id');
  if (!feedbackHasFamily) {
    await knex.schema.alterTable('feeding_feedbacks', (table) => {
      table.string('family_id', 36).nullable().references('id').inTable('families').onDelete('SET NULL').index();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const feedbackHasFamily = await knex.schema.hasColumn('feeding_feedbacks', 'family_id');
  if (feedbackHasFamily) {
    await knex.schema.alterTable('feeding_feedbacks', (table) => {
      table.dropColumn('family_id');
    });
  }

  const feedbackHasActor = await knex.schema.hasColumn('feeding_feedbacks', 'actor_user_id');
  if (feedbackHasActor) {
    await knex.schema.alterTable('feeding_feedbacks', (table) => {
      table.dropColumn('actor_user_id');
    });
  }

  const familiesHasExpireAt = await knex.schema.hasColumn('families', 'invite_code_expire_at');
  if (familiesHasExpireAt) {
    await knex.schema.alterTable('families', (table) => {
      table.dropColumn('invite_code_expire_at');
    });
  }
}
