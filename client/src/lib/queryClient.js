import { QueryClient } from "@tanstack/react-query";
async function throwIfResNotOk(res) {
    if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
    }
}
export async function apiRequest(method, url, data) {
    // Ensure full URL by prepending server base URL if it's a relative path
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const res = await fetch(fullUrl, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
    });
    await throwIfResNotOk(res);
    return res;
}
export const getQueryFn = ({ on401: unauthorizedBehavior }) => async ({ queryKey }) => {
    const res = await apiRequest("GET", queryKey.join("/"));
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
    }
    return await res.json();
};
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            refetchInterval: false,
            refetchOnWindowFocus: false,
            staleTime: Infinity,
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});
