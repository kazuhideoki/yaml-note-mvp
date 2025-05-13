import { md_headings_to_yaml } from './pkg/core_wasm.js';

// 大きなMarkdownファイルを生成
function generateLargeMarkdown(headingCount) {
  let markdown = "---\nschema_path: ./test.yaml\nvalidated: true\n---\n# Main Title\n\n";
  
  for (let i = 1; i <= headingCount; i++) {
    markdown += `\n## Section ${i}\n\nContent for section ${i}\n`;
    
    // 各セクションに3つのサブセクションを追加
    for (let j = 1; j <= 3; j++) {
      markdown += `\n### Subsection ${i}.${j}\n\nNested content for subsection ${i}.${j}\n`;
    }
  }
  
  return markdown;
}

// パフォーマンステスト実行
function runPerformanceTest() {
  console.log("=== パフォーマンステスト ===");
  const sizes = [100, 500, 1000];
  
  for (const size of sizes) {
    const largeMd = generateLargeMarkdown(size);
    console.log(`\n${size}セクションのMarkdownを処理:（行数: 約${size * 10}行）`);
    
    const startTime = performance.now();
    const yaml = md_headings_to_yaml(largeMd);
    const endTime = performance.now();
    
    console.log(`処理時間: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`出力YAML長: ${yaml.length}文字`);
  }
}

runPerformanceTest();