import { supabase } from '../supabaseClient';

export interface KnowledgeNode {
  ma_kien_thuc: string;
  ten_kien_thuc: string;
  ma_kt_parent: string | null;
  [key: string]: any;
}

export interface KnowledgeTreeNode extends KnowledgeNode {
  children: KnowledgeTreeNode[];
}

/**
 * Fetches the complete knowledge hierarchy from the database
 * and returns it as a structured tree object.
 */
export const syncKnowledgeTree = async (): Promise<KnowledgeTreeNode[]> => {
  const { data, error } = await supabase
    .from('kien_thuc')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching knowledge tree:', error);
    throw error;
  }
  
  const nodes: KnowledgeNode[] = data || [];
  
  const buildTree = (parentId: string | null): KnowledgeTreeNode[] => {
    return nodes
      .filter(node => node.ma_kt_parent === parentId)
      .map(node => ({
        ...node,
        children: buildTree(node.ma_kien_thuc)
      }));
  };
  
  return buildTree(null);
};

/**
 * Helper to flatten the tree for dropdowns and mapping
 */
export const flattenKnowledgeTree = (tree: KnowledgeTreeNode[]): KnowledgeNode[] => {
  let flat: KnowledgeNode[] = [];
  for (const node of tree) {
    const { children, ...rest } = node;
    flat.push(rest);
    if (children && children.length > 0) {
      flat = flat.concat(flattenKnowledgeTree(children));
    }
  }
  return flat;
};
