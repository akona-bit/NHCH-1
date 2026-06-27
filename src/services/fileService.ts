import { supabase } from '../supabaseClient';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const { data, error } = await supabase.storage.from('app-files').upload(path, file);
  if (error) throw error;
  return data.path;
};

export const getSignedUrl = async (path: string, expiresIn: number = 60 * 60 * 24): Promise<string | null> => {
  const { data, error } = await supabase.storage.from('app-files').createSignedUrl(path, expiresIn);
  if (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
  return data?.signedUrl || null;
};

export const deleteFile = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from('app-files').remove([path]);
  if (error) throw error;
};
