import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTabs } from '../EditorTabs';
import { TabType } from '../../types';

describe('EditorTabs', () => {
  const onTabChangeMock = vi.fn();
  
  beforeEach(() => {
    onTabChangeMock.mockReset();
  });

  /**
   * タブが正しく表示され、クリックイベントが正しく発火するかテストする
   */
  test('renders tabs and handles click events correctly', () => {
    render(
      <EditorTabs 
        currentSchemaPath="/path/to/schema.yaml"
        activeTab="note"
        onTabChange={onTabChangeMock}
      />
    );
    
    // タブが正しく表示されているか確認
    expect(screen.getByText('Note.md')).toBeInTheDocument();
    expect(screen.getByText('Schema.yaml')).toBeInTheDocument();
    
    // Noteタブがアクティブでハイライトされているか確認
    const noteTab = screen.getByText('Note.md');
    expect(noteTab.closest('button')).toHaveClass('border-blue-500');
    
    // SchemaタブをクリックしたときにonTabChangeが呼ばれるか確認
    const schemaTab = screen.getByText('Schema.yaml');
    fireEvent.click(schemaTab);
    expect(onTabChangeMock).toHaveBeenCalledWith('schema');
  });

  /**
   * スキーマパスが設定されていない場合、Schemaタブが無効化されるかテストする
   */
  test('disables schema tab when no schema path is available', () => {
    render(
      <EditorTabs 
        currentSchemaPath={null}
        activeTab="note"
        onTabChange={onTabChangeMock}
      />
    );
    
    // スキーマパスがない場合、タブに「未設定」が表示され、無効化されているか確認
    const schemaTab = screen.getByText(/Schema.yaml \(未設定\)/);
    expect(schemaTab.closest('button')).toBeDisabled();
    
    // 無効化されたタブをクリックしてもonTabChangeが呼ばれないことを確認
    fireEvent.click(schemaTab);
    expect(onTabChangeMock).not.toHaveBeenCalled();
  });

  /**
   * Schemaタブがアクティブな場合、正しくスタイリングされるかテストする
   */
  test('highlights schema tab when active', () => {
    render(
      <EditorTabs 
        currentSchemaPath="/path/to/schema.yaml"
        activeTab="schema"
        onTabChange={onTabChangeMock}
      />
    );
    
    // Schemaタブがアクティブでハイライトされているか確認
    const schemaTab = screen.getByText('Schema.yaml');
    expect(schemaTab.closest('button')).toHaveClass('border-blue-500');
    
    // Noteタブがハイライトされていないことを確認
    const noteTab = screen.getByText('Note.md');
    expect(noteTab.closest('button')).not.toHaveClass('border-blue-500');
  });
});