import { createClient } from '@/lib/supabase/client';

export async function uploadMemberPhoto(file: File): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upload photos.');

  // Create a unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `portraits/${fileName}`;

  // 1. Upload the file to the 'member-portraits' bucket
  const { error: uploadError } = await supabase.storage
    .from('member-portraits')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error('Failed to upload photo to storage.');
  }

  // 2. Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('member-portraits')
    .getPublicUrl(filePath);

  return publicUrl;
}
