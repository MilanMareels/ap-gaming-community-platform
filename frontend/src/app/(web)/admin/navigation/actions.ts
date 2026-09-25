'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateNavigation() {
  revalidateTag('navigation', { expire: 60 });
}
