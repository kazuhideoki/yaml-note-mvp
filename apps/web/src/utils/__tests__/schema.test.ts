import {
  fetchSchema,
  invalidateSchemaCache,
  clearSchemaCache,
} from "../schema";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";

// モックサーバーの設定
const server = setupServer(
  http.get("/schemas/test.yaml", () => {
    return HttpResponse.text("type: object\nproperties:\n  title:\n    type: string");
  }),
  http.get("/custom/path/schema.yaml", () => {
    return HttpResponse.text("type: object\nproperties:\n  custom:\n    type: string");
  }),
  http.get("/error/schema.yaml", () => {
    return new HttpResponse(null, { status: 404 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  clearSchemaCache();
});
afterAll(() => server.close());

describe("fetchSchema", () => {
  test("スキーマを正常に取得できる", async () => {
    const schema = await fetchSchema("test.yaml");
    expect(schema).toContain("type: object");
    expect(schema).toContain("title");
  });

  test("相対パスのスキーマを取得できる", async () => {
    const schema = await fetchSchema("./schema.yaml", "/custom/path/file.md");
    expect(schema).toContain("type: object");
    expect(schema).toContain("custom");
  });

  test("存在しないスキーマの場合はエラーが発生する", async () => {
    await expect(fetchSchema("error/schema.yaml")).rejects.toThrow();
  });

  test("スキーマをキャッシュから取得できる", async () => {
    // 最初の呼び出し
    await fetchSchema("test.yaml");

    // サーバーエンドポイントを変更してもキャッシュから取得される
    server.use(
      http.get("/schemas/test.yaml", () => {
        return HttpResponse.text("CHANGED CONTENT");
      }),
    );

    // 2回目の呼び出し（キャッシュから）
    const cachedSchema = await fetchSchema("test.yaml");
    expect(cachedSchema).toContain("type: object");
    expect(cachedSchema).not.toContain("CHANGED CONTENT");
  });
});

describe("スキーマキャッシュ管理", () => {
  test("キャッシュを無効化できる", async () => {
    // 最初の呼び出し
    await fetchSchema("test.yaml");

    // サーバーエンドポイントを変更
    server.use(
      http.get("/schemas/test.yaml", () => {
        return HttpResponse.text("CHANGED CONTENT");
      }),
    );

    // キャッシュ無効化
    invalidateSchemaCache("test.yaml");

    // 再取得
    const newSchema = await fetchSchema("test.yaml");
    expect(newSchema).toContain("CHANGED CONTENT");
  });

  test("キャッシュを全てクリアできる", async () => {
    // 複数のスキーマをキャッシュに入れる
    await fetchSchema("test.yaml");
    await fetchSchema("./schema.yaml", "/custom/path/file.md");

    // エンドポイントを変更
    server.use(
      http.get("/schemas/test.yaml", () => {
        return HttpResponse.text("CHANGED1");
      }),
      http.get("/custom/path/schema.yaml", () => {
        return HttpResponse.text("CHANGED2");
      }),
    );

    // キャッシュクリア
    clearSchemaCache();

    // 再取得
    const schema1 = await fetchSchema("test.yaml");
    const schema2 = await fetchSchema("./schema.yaml", "/custom/path/file.md");

    expect(schema1).toContain("CHANGED1");
    expect(schema2).toContain("CHANGED2");
  });
});