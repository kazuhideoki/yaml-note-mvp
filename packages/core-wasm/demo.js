const fs = require("fs");
const path = require("path");

async function main() {
  try {
    // WASM モジュールをインポート
    const corePath = path.resolve(__dirname, "pkg", "core_wasm.js");
    const {
      parse_and_validate_frontmatter,
      md_headings_to_yaml,
      validate_yaml,
      md_to_yaml,
      yaml_to_md,
    } = await import(corePath);

    console.log("=== フロントマターテスト ===");

    // テスト用 Markdown（有効なフロントマター）
    const validMd = `---
schema_path: ./schemas/test.yaml
validated: true
---
# Test Document
## Section 1
Content for section 1
## Section 2
Content for section 2
### Subsection 2.1
Nested content
`;

    // テスト用 Markdown（無効なフロントマター）
    const invalidMd = `---
schema_path:
validated: invalid_value
---
# Test Document
`;

    // テスト用 Markdown（フロントマターなし）
    const noFrontmatterMd = `# No Frontmatter Document
Just content here.
`;

    console.log("\n1. 有効なフロントマターの解析と検証:");
    const validResult = parse_and_validate_frontmatter(validMd);
    console.log(validResult);

    console.log("\n2. 無効なフロントマターの解析と検証:");
    const invalidResult = parse_and_validate_frontmatter(invalidMd);
    console.log(invalidResult);

    console.log("\n3. フロントマターがない場合の解析と検証:");
    const noFrontmatterResult = parse_and_validate_frontmatter(noFrontmatterMd);
    console.log(noFrontmatterResult);

    console.log("\n=== Markdown→YAML変換テスト ===");
    console.log("\n4. 見出し構造をYAMLに変換:");
    const yamlResult = md_headings_to_yaml(validMd);
    console.log(yamlResult);

    console.log("\n5. 既存のmd_to_yaml関数との比較:");
    const oldYamlResult = md_to_yaml(validMd);
    console.log("既存の変換結果:");
    console.log(oldYamlResult);

    // スキーマを使用した検証例
    console.log("\n=== スキーマ検証テスト ===");
    const simpleSchema = `
type: object
properties:
  title:
    type: string
  sections:
    type: array
    items:
      type: object
      properties:
        heading:
          type: string
        content:
          type: string
required:
  - title
`;

    console.log("\n6. 変換したYAMLのスキーマ検証:");
    const schemaValidationResult = validate_yaml(yamlResult, simpleSchema);
    console.log(schemaValidationResult);

    console.log("\n=== テスト完了 ===");
  } catch (error) {
    console.error("エラーが発生しました:", error);
  }
}

main().catch(console.error);
