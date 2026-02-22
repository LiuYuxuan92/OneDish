import { UserRecipeService } from '../src/services/userRecipe.service';

const service: any = new UserRecipeService();

const cases = [
  {
    id: 'TC01',
    data: {
      name: '番茄牛肉一锅炖', status: 'published', is_active: true,
      adult_version: { ingredients: [{ name: '番茄' }, { name: '牛肉' }] },
      baby_version: { ingredients: [{ name: '番茄' }, { name: '牛肉末' }] },
      baby_age_range: '10-12个月', prep_time: 25, difficulty: '简单', servings: '2人份',
      step_branches: [{ note: '宝宝先出锅' }], report_count: 0, adoption_rate: 0.8,
    },
    expectPool: true,
  },
  {
    id: 'TC02',
    data: {
      name: '南瓜糊', status: 'published', is_active: true,
      adult_version: { ingredients: [{ name: '南瓜' }] }, baby_version: { ingredients: [{ name: '南瓜' }] },
      prep_time: 15, report_count: 0, adoption_rate: 0.3,
    },
    expectPool: false,
  },
  {
    id: 'TC03',
    data: {
      name: '蜂蜜奶', status: 'published', is_active: true,
      adult_version: { ingredients: [{ name: '蜂蜜' }, { name: '奶' }] },
      baby_version: { ingredients: [{ name: '蜂蜜' }, { name: '奶' }] },
      baby_age_range: '8-10个月', prep_time: 10, difficulty: '简单', servings: '1人份',
      step_branches: [{ note: '混合' }], report_count: 0, adoption_rate: 0.9,
    },
    expectPool: false,
  },
  { id: 'TC04', data: { name: '举报过多菜谱', status: 'published', is_active: true, adult_version: { ingredients: [{ name: '鸡蛋' }, { name: '米饭' }] }, baby_version: { ingredients: [{ name: '鸡蛋' }, { name: '米饭' }] }, baby_age_range: '12个月+', prep_time: 20, difficulty: '简单', servings: '2人份', step_branches: [{ note: '先分离' }], report_count: 3, adoption_rate: 0.7 }, expectPool: false },
  { id: 'TC05', data: { name: '低采纳菜谱', status: 'published', is_active: true, adult_version: { ingredients: [{ name: '鸡蛋' }, { name: '米饭' }] }, baby_version: { ingredients: [{ name: '鸡蛋' }, { name: '米饭' }] }, baby_age_range: '12个月+', prep_time: 20, difficulty: '简单', servings: '2人份', step_branches: [{ note: '先分离' }], report_count: 0, adoption_rate: 0.05 }, expectPool: false },
  { id: 'TC06', data: { name: '可执行但反馈一般', status: 'published', is_active: true, adult_version: { ingredients: [{ name: '鸡蛋' }, { name: '米饭' }] }, baby_version: { ingredients: [{ name: '鸡蛋' }, { name: '米饭' }] }, baby_age_range: '12个月+', prep_time: 20, difficulty: '简单', servings: '2人份', step_branches: [{ note: '先分离' }], report_count: 1, adoption_rate: 0.12 }, expectPool: false },
];

for (const c of cases) {
  const score = service.calculateQualityScore(c.data);
  const inPool = service.shouldEnterRecommendPool(c.data, score);
  console.log(`${c.id}: score=${score}, inPool=${inPool}, expectPool=${c.expectPool}`);
}
