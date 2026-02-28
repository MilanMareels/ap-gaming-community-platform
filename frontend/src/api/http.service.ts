import createClient from 'openapi-fetch';
import type { paths } from './definitions';

const authExceptions: (keyof paths)[] = ['/reservations'];
const publicPages: string[] = ['/login'];

const middlewareFetch = async (input: Request) => {
  const result = await fetch(input);

  const path = new URL(input.url).pathname;

  if (result.status === 401) {
    const relativePath = path.replace(/^\/api/, '') as keyof paths;
    if (authExceptions.includes(relativePath)) {
      return result;
    }

    const pathname = window.location.pathname;
    if (publicPages.some((page) => pathname === page)) return result;
    window.location.href =
      '/login?authfailed=1&returnUrl=' + encodeURIComponent(pathname);
  }

  if (result.status === 0 && !navigator.onLine) return Promise.reject();

  return result;
};

export const apiClient = createClient<paths>({
  fetch: middlewareFetch,
  baseUrl: '/api',
});

export const useHttpService = () => {
  const get = apiClient.GET;
  const post = apiClient.POST;
  const put = apiClient.PUT;
  const del = apiClient.DELETE;
  const patch = apiClient.PATCH;

  return { get, post, put, del, patch };
};
