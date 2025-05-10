// WASMモジュールテスト用スクリプト

async function testWasmModule() {
  try {
    // WASMモジュールを動的にインポート
    const coreWasm = await import('./pkg/core_wasm.js');
    
    console.log('WASMモジュールが正常にロードされました');
    console.log('バージョン:', coreWasm.version());
    
    // YAMLパース機能のテスト
    const testYaml = `
title: テストノート
content: これはテスト用のコンテンツです
tags:
  - test
  - yaml
`;
    
    console.log('\n--- parse_yaml テスト ---');
    const jsonResult = coreWasm.parse_yaml(testYaml);
    console.log('YAML -> JSON結果:', jsonResult);
    
    console.log('\n--- stringify_yaml テスト ---');
    const yamlResult = coreWasm.stringify_yaml(jsonResult);
    console.log('JSON -> YAML結果:\n', yamlResult);
    
    console.log('\n--- validate_yaml テスト ---');
    const testSchema = `
type: object
properties:
  title:
    type: string
  content:
    type: string
  tags:
    type: array
    items:
      type: string
required:
  - title
`;
    const validationResult = coreWasm.validate_yaml(testYaml, testSchema);
    console.log('バリデーション結果:', validationResult);
    
    console.log('\n--- apply_patch テスト ---');
    const testPatch = JSON.stringify([
      { op: 'add', path: '/metadata', value: { author: 'Test User' } },
      { op: 'replace', path: '/content', value: '更新されたコンテンツ' }
    ]);
    const patchResult = coreWasm.apply_patch(testYaml, testPatch);
    console.log('パッチ適用結果:\n', patchResult);
    
    console.log('\nすべてのテストが完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

testWasmModule();