module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  transform: {},
  // 有些测试需要读取文件，禁用增强的隔离
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
};
