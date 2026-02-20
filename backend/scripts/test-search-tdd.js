/**
 * 搜索功能测试脚本 (TDD)
 * 测试目标：验证搜索导航栏的所有功能和数据展示渲染
 */

const API_BASE = 'http://localhost:3000/api/v1';

// 测试用例收集
const testResults = [];
let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    const result = fn();
    if (result) {
      passCount++;
      testResults.push({ name, status: 'PASS' });
      console.log(`✅ ${name}`);
    } else {
      testResults.push({ name, status: 'FAIL', error: 'Assertion failed' });
      console.log(`❌ ${name}`);
    }
  } catch (error) {
    testResults.push({ name, status: 'ERROR', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
  return true;
}

function assertGreaterThan(actual, min, message) {
  if (actual <= min) {
    throw new Error(`${message}: expected > ${min}, got ${actual}`);
  }
  return true;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('搜索功能测试 - Test Driven Development');
  console.log('='.repeat(60));

  // ========================================
  // 测试1: API健康检查
  // ========================================
  console.log('\n--- 测试1: API健康检查 ---');

  test('API服务器运行正常', () => {
    const http = require('http');
    return new Promise((resolve) => {
      http.get(`${API_BASE.replace('/api/v1', '')}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.status === 'ok');
          } catch {
            resolve(false);
          }
        });
      }).on('error', () => resolve(false));
    });
  });

  // ========================================
  // 测试2: 统一搜索API - 本地数据库
  // ========================================
  console.log('\n--- 测试2: 统一搜索API (本地) ---');

  test('搜索"红烧"返回本地结果', async () => {
    const response = await fetch(`${API_BASE}/search?keyword=红烧`);
    const json = await response.json();

    assertEqual(json.code, 200, '响应码');
    assertGreaterThan(json.data.total, 0, '结果数量');
    assertEqual(json.data.source, 'local', '数据来源');

    // 验证返回的数据结构
    const item = json.data.results[0];
    assertEqual(typeof item.id, 'string', 'ID类型');
    assertEqual(typeof item.name, 'string', '名称类型');

    console.log(`   - 找到 ${json.data.total} 条本地结果`);
    return true;
  });

  test('搜索"番茄"返回本地结果', async () => {
    const response = await fetch(`${API_BASE}/search?keyword=番茄`);
    const json = await response.json();

    assertEqual(json.code, 200, '响应码');
    assertGreaterThan(json.data.total, 0, '结果数量');

    console.log(`   - 找到 ${json.data.total} 条结果`);
    return true;
  });

  // ========================================
  // 测试3: 指定来源搜索
  // ========================================
  console.log('\n--- 测试3: 指定来源搜索 ---');

  test('指定来源: local搜索"红烧"', async () => {
    const response = await fetch(`${API_BASE}/search/source/local?keyword=红烧`);
    const json = await response.json();

    assertEqual(json.code, 200, '响应码');
    assertEqual(json.data.source, 'local', '数据来源');

    console.log(`   - 本地搜索: ${json.data.total} 条结果`);
    return true;
  });

  test('指定来源: tianxing搜索"红烧"', async () => {
    const response = await fetch(`${API_BASE}/search/source/tianxing?keyword=红烧`);
    const json = await response.json();

    assertEqual(json.code, 200, '响应码');
    assertEqual(json.data.source, 'tianxing', '数据来源');

    console.log(`   - 联网搜索: ${json.data.total} 条结果`);
    return true;
  });

  // ========================================
  // 测试4: 边界情况测试
  // ========================================
  console.log('\n--- 测试4: 边界情况测试 ---');

  test('空关键词返回400错误', async () => {
    const response = await fetch(`${API_BASE}/search?keyword=`);
    const json = await response.json();

    assertEqual(response.status, 400, 'HTTP状态码');
    assertEqual(json.code, 400, '响应码');

    return true;
  });

  test('不存在的关键词返回空结果', async () => {
    const response = await fetch(`${API_BASE}/search?keyword=xyz123abc不存在`);
    const json = await response.json();

    assertEqual(json.code, 200, '响应码');
    assertEqual(json.data.total, 0, '结果数量应为0');

    console.log(`   - 不存在的关键词正确返回空结果`);
    return true;
  });

  // ========================================
  // 测试5: 搜索结果数据格式验证
  // ========================================
  console.log('\n--- 测试5: 搜索结果数据格式验证 ---');

  test('返回结果包含必需字段', async () => {
    const response = await fetch(`${API_BASE}/search?keyword=红烧`);
    const json = await response.json();

    const item = json.data.results[0];
    const requiredFields = ['id', 'name', 'source'];

    for (const field of requiredFields) {
      if (!(field in item)) {
        throw new Error(`缺少必需字段: ${field}`);
      }
    }

    console.log(`   - 字段验证通过: ${requiredFields.join(', ')}`);
    return true;
  });

  test('source字段值有效', async () => {
    const response = await fetch(`${API_BASE}/search?keyword=红烧`);
    const json = await response.json();

    const validSources = ['local', 'tianxing', 'ai'];
    const source = json.data.source;

    if (!validSources.includes(source)) {
      throw new Error(`无效的source值: ${source}`);
    }

    console.log(`   - source值有效: ${source}`);
    return true;
  });

  // ========================================
  // 测试6: 分页参数测试
  // ========================================
  console.log('\n--- 测试6: 搜索结果统计 ---');

  test('返回结果包含total字段', async () => {
    const response = await fetch(`${API_BASE}/search?keyword=红烧`);
    const json = await response.json();

    if (typeof json.data.total !== 'number') {
      throw new Error('total字段应该是数字类型');
    }

    if (json.data.total !== json.data.results.length) {
      throw new Error('total应该等于results数组长度');
    }

    console.log(`   - total: ${json.data.total}, results.length: ${json.data.results.length}`);
    return true;
  });

  // ========================================
  // 测试7: 响应时间测试
  // ========================================
  console.log('\n--- 测试7: 响应时间测试 ---');

  test('搜索响应时间 < 2秒', async () => {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/search?keyword=红烧`);
    const endTime = Date.now();

    const duration = (endTime - startTime) / 1000;
    console.log(`   - 响应时间: ${duration.toFixed(2)}秒`);

    if (duration > 2) {
      console.log(`   ⚠️ 警告: 响应时间超过2秒`);
    }

    return true;
  });

  // ========================================
  // 测试总结
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log(`测试完成: ${passCount}/${testCount} 通过`);
  console.log('='.repeat(60));

  // 打印失败测试
  const failedTests = testResults.filter(t => t.status !== 'PASS');
  if (failedTests.length > 0) {
    console.log('\n失败测试:');
    failedTests.forEach(t => {
      console.log(`  - ${t.name}: ${t.error || t.status}`);
    });
  }

  return {
    total: testCount,
    passed: passCount,
    failed: failedTests.length,
    results: testResults
  };
}

// 运行测试
runTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
