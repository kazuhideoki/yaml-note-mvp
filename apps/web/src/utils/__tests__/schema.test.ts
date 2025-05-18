import { fetchSchema, isAbsolutePath } from '../schema';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest';

// モックサーバーの設定
const server = setupServer(
  http.get('/sample/test.yaml', () => {
    return HttpResponse.text('type: object\nproperties:\n  title:\n    type: string');
  }),
  http.get('/custom/path/test.yaml', () => {
    return HttpResponse.text('type: object\nproperties:\n  title:\n    type: string');
  }),
  http.get('/custom/path/schema.yaml', () => {
    return HttpResponse.text('type: object\nproperties:\n  custom:\n    type: string');
  }),
  http.get('/sample/implicit.yaml', () => {
    return HttpResponse.text('type: object\nproperties:\n  implicit:\n    type: string');
  }),
  http.get('/custom/path/implicit.yaml', () => {
    return HttpResponse.text('type: object\nproperties:\n  implicit:\n    type: string');
  }),
  http.get('/parent.yaml', () => {
    return HttpResponse.text('type: object\nproperties:\n  parent:\n    type: string');
  }),
  http.get('/custom/parent.yaml', () => {
    return HttpResponse.text('type: object\nproperties:\n  parent:\n    type: string');
  }),
  http.get('/sample/cached.yaml', () => {
    return HttpResponse.text('ORIGINAL CONTENT');
  }),
  http.get('/custom/path/cached.yaml', () => {
    return HttpResponse.text('ORIGINAL CONTENT');
  }),
  http.get('/sample/invalidate-test.yaml', () => {
    return HttpResponse.text('ORIGINAL CONTENT');
  }),
  http.get('/custom/path/invalidate-test.yaml', () => {
    return HttpResponse.text('ORIGINAL CONTENT');
  }),
  http.get('/sample/clear-test1.yaml', () => {
    return HttpResponse.text('ORIGINAL1');
  }),
  http.get('/custom/path/clear-test1.yaml', () => {
    return HttpResponse.text('ORIGINAL1');
  }),
  http.get('/sample/clear-test2.yaml', () => {
    return HttpResponse.text('ORIGINAL2');
  }),
  http.get('/custom/path/clear-test2.yaml', () => {
    return HttpResponse.text('ORIGINAL2');
  }),
  http.get('/error/schema.yaml', () => {
    return new HttpResponse(null, { status: 404 });
  }),
  http.get('/sample/nonexistent.yaml', () => {
    return new HttpResponse(null, { status: 404 });
  }),
  http.get('/custom/path/nonexistent.yaml', () => {
    return new HttpResponse(null, { status: 404 });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

describe('isAbsolutePath', () => {
  test('Unixスタイルの絶対パスを正しく判定する', () => {
    expect(isAbsolutePath('/schemas/test.yaml')).toBe(true);
    expect(isAbsolutePath('/var/www/schemas/test.yaml')).toBe(true);
  });

  test('Windowsスタイルの絶対パスを正しく判定する', () => {
    expect(isAbsolutePath('C:\\schemas\\test.yaml')).toBe(true);
    expect(isAbsolutePath('D:/schemas/test.yaml')).toBe(true);
  });

  test('URLを絶対パスとして判定する', () => {
    expect(isAbsolutePath('http://example.com/schema.yaml')).toBe(true);
    expect(isAbsolutePath('https://example.com/schema.yaml')).toBe(true);
  });

  test('相対パスを正しく判定する', () => {
    expect(isAbsolutePath('./schema.yaml')).toBe(false);
    expect(isAbsolutePath('../schema.yaml')).toBe(false);
    expect(isAbsolutePath('schema.yaml')).toBe(false);
    expect(isAbsolutePath('schemas/test.yaml')).toBe(false);
  });

  test('空文字列はfalseを返す', () => {
    expect(isAbsolutePath('')).toBe(false);
  });
});

describe('fetchSchema', () => {
  test('明示的な相対パス（./で始まる）のスキーマを取得できる', async () => {
    server.use(
      http.get('/custom/path/test.yaml', () => {
        return HttpResponse.text('EXPLICIT RELATIVE PATH');
      })
    );

    const schema = await fetchSchema('./test.yaml', '/custom/path/file.md');
    expect(schema).toContain('EXPLICIT RELATIVE PATH');
  });

  test('暗黙的な相対パス（./なしで始まる）のスキーマを取得できる', async () => {
    server.use(
      http.get('/custom/path/implicit.yaml', () => {
        return HttpResponse.text('IMPLICIT RELATIVE PATH');
      })
    );

    const schema = await fetchSchema('implicit.yaml', '/custom/path/file.md');
    expect(schema).toContain('IMPLICIT RELATIVE PATH');
  });

  test('親ディレクトリ参照の相対パス（../で始まる）のスキーマを取得できる', async () => {
    server.use(
      http.get('/custom/parent.yaml', () => {
        return HttpResponse.text('PARENT DIRECTORY');
      })
    );

    const schema = await fetchSchema('../parent.yaml', '/custom/path/file.md');
    expect(schema).toContain('PARENT DIRECTORY');
  });

  test('絶対パスを指定するとエラーになる', async () => {
    await expect(fetchSchema('/schemas/test.yaml')).rejects.toThrow(
      '絶対パスでのスキーマ参照はサポートされていません'
    );
    await expect(fetchSchema('C:\\schemas\\test.yaml')).rejects.toThrow(
      '絶対パスでのスキーマ参照はサポートされていません'
    );
    await expect(fetchSchema('http://example.com/schema.yaml')).rejects.toThrow(
      '絶対パスでのスキーマ参照はサポートされていません'
    );
  });

  test('存在しないスキーマの場合はエラーが発生する', async () => {
    await expect(fetchSchema('nonexistent.yaml', '/custom/path/file.md')).rejects.toThrow();
  });

  test('スキーマをキャッシュから取得できる', async () => {
    // 最初の呼び出し
    server.use(
      http.get('/custom/path/cached.yaml', () => {
        return HttpResponse.text('ORIGINAL CONTENT');
      })
    );

    await fetchSchema('cached.yaml', '/custom/path/file.md');

    // サーバーエンドポイントを変更してもキャッシュから取得される
    server.use(
      http.get('/custom/path/cached.yaml', () => {
        return HttpResponse.text('CHANGED CONTENT');
      })
    );

    // 2回目の呼び出し（キャッシュから）
    const cachedSchema = await fetchSchema('cached.yaml', '/custom/path/file.md');
    expect(cachedSchema).toContain('ORIGINAL CONTENT');
    expect(cachedSchema).not.toContain('CHANGED CONTENT');
  });
});
