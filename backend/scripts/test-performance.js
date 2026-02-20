/**
 * 搜索性能测试
 */

const API_BASE = 'http://localhost:3000/api/v1';

async function performanceTest() {
  console.log('='.repeat(60));
  console.log('搜索性能测试');
  console.log('='.repeat(60));

  const testKeywords = ['红烧', '番茄', '鸡翅', '米饭', '面条'];

  const results = [];

  for (const keyword of testKeywords) {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/search?keyword=${encodeURIComponent(keyword)}`);
    const endTime = Date.now();

    const duration = endTime - startTime;
    const json = await response.json();

    results.push({
      keyword,
      duration: duration.toFixed(0),
      total: json.data.total,
      status: duration < 1000 ? '🟢 快速' : duration < 2000 ? '🟡 正常' : '🔴 慢'
    });

    console.log(`搜索"${keyword}": ${duration}ms - ${json.data.total}条结果 - ${results[results.length - 1].status}`);
  }

  // 性能统计
  const avgDuration = results.reduce((sum, r) => sum + parseInt(r.duration), 0) / results.length;
  console.log(`\n平均响应时间: ${avgDuration.toFixed(0)}ms`);

  if (avgDuration < 500) {
    console.log('✅ 性能优秀');
  } else if (avgDuration < 1000) {
    console.log('✅ 性能良好');
  } else {
    console.log('⚠️ 性能需要优化');
  }

  // 测试并发请求
  console.log('\n--- 并发请求测试 ---');
  const concurrentStart = Date.now();
  await Promise.all([
    fetch(`${API_BASE}/search?keyword=红烧`),
    fetch(`${API_BASE}/search?keyword=番茄`),
    fetch(`${API_BASE}/search?keyword=鸡翅`)
  ]);
  const concurrentEnd = Date.now();
  console.log(`3个并发请求耗时: ${concurrentEnd - concurrentStart}ms`);

  return results;
}

performanceTest().catch(console.error);
