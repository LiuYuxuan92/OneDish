import { UserRecipeService } from '../services/userRecipe.service';

async function main() {
  const service = new UserRecipeService();
  const result = await service.recomputeQualityScores();
  console.log('[ugc-quality] recompute done:', result);
}

main().catch((e) => {
  console.error('[ugc-quality] recompute failed', e);
  process.exit(1);
});
