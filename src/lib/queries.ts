import {
  useInfiniteQuery,
  useQuery,
  type QueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, type QueryParams } from "./api";
import type {
  Comment,
  DashboardData,
  HomeData,
  Innovation,
  Innovator,
  Institution,
  ModerationOverview,
  Notification,
  Opportunity,
  OpportunityApplication,
  Paginated,
  CollaborationRequest,
} from "./api-types";

export interface InnovationFilters {
  q?: string | undefined;
  category?: string | undefined;
  stage?: string | undefined;
  institution?: string | undefined;
  sort?: "latest" | "popular" | "discussed" | "views" | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
  mine?: boolean | undefined;
  status?: string | undefined;
}

export interface InnovatorFilters {
  q?: string | undefined;
  category?: string | undefined;
  sort?: "featured" | "newest" | "projects" | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
}

export interface InstitutionFilters {
  q?: string | undefined;
  type?: string | undefined;
  verified?: boolean | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
}

export interface OpportunityFilters {
  q?: string | undefined;
  type?: string | undefined;
  category?: string | undefined;
  open_only?: boolean | undefined;
  sort?: "deadline" | "newest" | "popular" | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
  status?: string | undefined;
}

export const queryKeys = {
  me: ["me"] as const,
  home: ["home"] as const,
  innovations: (filters: InnovationFilters) => ["innovations", filters] as const,
  innovation: (slug: string) => ["innovation", slug] as const,
  innovators: (filters: InnovatorFilters) => ["innovators", filters] as const,
  innovator: (slug: string) => ["innovator", slug] as const,
  institutions: (filters: InstitutionFilters) => ["institutions", filters] as const,
  opportunities: (filters: OpportunityFilters) => ["opportunities", filters] as const,
  comments: (slug: string) => ["comments", slug] as const,
  dashboard: ["dashboard"] as const,
  notifications: ["notifications"] as const,
  bookmarks: ["bookmarks"] as const,
  requests: (direction?: string) => ["requests", direction ?? "all"] as const,
  applications: ["applications"] as const,
  moderation: ["moderation"] as const,
};

export async function fetchHome(signal?: AbortSignal): Promise<HomeData> {
  return api.get<HomeData>("/home/", undefined, signal);
}

export async function fetchInnovationsPage(
  filters: InnovationFilters,
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<Innovation>> {
  const pageSize = filters.page_size ?? 9;
  const params: QueryParams = {
    page,
    page_size: pageSize,
    q: filters.q,
    category: filters.category,
    stage: filters.stage,
    institution: filters.institution,
    sort: filters.sort,
    status: filters.status,
    mine: filters.mine ? 1 : undefined,
  };
  return api.get<Paginated<Innovation>>("/innovations/", params, signal);
}

export function useHome(initialData?: HomeData) {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: ({ signal }) => fetchHome(signal),
    initialData,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useInfiniteInnovations(filters: InnovationFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.innovations(filters),
    queryFn: ({ pageParam, signal }) => fetchInnovationsPage(filters, pageParam as number, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? (lastPageParam as number) + 1 : undefined,
    enabled,
  });
}

export function useInnovationsList(filters: InnovationFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.innovations(filters),
    queryFn: ({ signal }) => fetchInnovationsPage(filters, 1, signal),
    enabled,
    staleTime: 15_000,
  });
}

export function useInnovation(slug: string, initialData?: Innovation) {
  return useQuery({
    queryKey: queryKeys.innovation(slug),
    queryFn: ({ signal }) => api.get<Innovation>(`/innovations/${slug}/`, undefined, signal),
    initialData,
    staleTime: 15_000,
    retry: 1,
  });
}

export async function fetchInnovationForLoader(slug: string): Promise<Innovation> {
  return api.get<Innovation>(`/innovations/${slug}/`, { track: 0 });
}

export async function fetchInnovatorsPage(
  filters: InnovatorFilters,
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<Innovator>> {
  return api.get<Paginated<Innovator>>(
    "/auth/innovators/",
    {
      page,
      page_size: filters.page_size ?? 12,
      q: filters.q,
      category: filters.category,
      sort: filters.sort,
    },
    signal,
  );
}

export function useInfiniteInnovators(filters: InnovatorFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.innovators(filters),
    queryFn: ({ pageParam, signal }) => fetchInnovatorsPage(filters, pageParam as number, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? (lastPageParam as number) + 1 : undefined,
  });
}

export async function fetchInnovatorForLoader(slug: string) {
  const response = await api.get<{ user: Innovator }>(`/auth/users/${slug}/`);
  return response.user;
}

export function useInnovator(slug: string, initialData?: Innovator) {
  return useQuery({
    queryKey: queryKeys.innovator(slug),
    queryFn: ({ signal }) =>
      api
        .get<{ user: Innovator }>(`/auth/users/${slug}/`, undefined, signal)
        .then((response) => response.user),
    initialData,
    staleTime: 15_000,
    retry: 1,
  });
}

export async function fetchInstitutionsPage(
  filters: InstitutionFilters,
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<Institution>> {
  return api.get<Paginated<Institution>>(
    "/institutions/",
    {
      page,
      page_size: filters.page_size ?? 12,
      q: filters.q,
      type: filters.type,
      verified: filters.verified ? 1 : undefined,
    },
    signal,
  );
}

export function useInfiniteInstitutions(filters: InstitutionFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.institutions(filters),
    queryFn: ({ pageParam, signal }) => fetchInstitutionsPage(filters, pageParam as number, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? (lastPageParam as number) + 1 : undefined,
  });
}

export function useInstitutionOptions() {
  return useQuery({
    queryKey: queryKeys.institutions({ page_size: 50 }),
    queryFn: ({ signal }) => fetchInstitutionsPage({ page_size: 50 }, 1, signal),
    staleTime: 5 * 60_000,
  });
}

export function useInstitutionStats() {
  return useQuery({
    queryKey: ["institution-stats"],
    queryFn: async () => {
      const [all, verified] = await Promise.all([
        fetchInstitutionsPage({ page_size: 1 }, 1),
        fetchInstitutionsPage({ page_size: 1, verified: true }, 1),
      ]);
      return { total: all.count, verified: verified.count };
    },
    staleTime: 60_000,
  });
}

export async function fetchOpportunitiesPage(
  filters: OpportunityFilters,
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<Opportunity>> {
  return api.get<Paginated<Opportunity>>(
    "/opportunities/",
    {
      page,
      page_size: filters.page_size ?? 9,
      q: filters.q,
      type: filters.type,
      category: filters.category,
      open_only: filters.open_only ? 1 : undefined,
      sort: filters.sort,
      status: filters.status,
    },
    signal,
  );
}

export function useInfiniteOpportunities(filters: OpportunityFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.opportunities(filters),
    queryFn: ({ pageParam, signal }) =>
      fetchOpportunitiesPage(filters, pageParam as number, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? (lastPageParam as number) + 1 : undefined,
  });
}

export function useOpportunitiesList(filters: OpportunityFilters) {
  return useQuery({
    queryKey: queryKeys.opportunities(filters),
    queryFn: ({ signal }) => fetchOpportunitiesPage(filters, 1, signal),
    staleTime: 15_000,
  });
}

export async function fetchComments(slug: string, page: number, signal?: AbortSignal) {
  return api.get<{ count: number; results: Comment[] }>(
    `/innovations/${slug}/comments/`,
    { page, page_size: 10 },
    signal,
  );
}

export function useInfiniteComments(slug: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments(slug),
    queryFn: ({ pageParam, signal }) => fetchComments(slug, pageParam as number, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.reduce((count, page) => count + page.results.length, 0) < lastPage.count
        ? allPages.length + 1
        : undefined,
    staleTime: 10_000,
  });
}

export async function fetchDashboard(): Promise<DashboardData> {
  return api.get<DashboardData>("/auth/dashboard/");
}

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: fetchDashboard });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () =>
      api.get<{ count: number; unreadCount: number; results: Notification[] }>(
        "/auth/notifications/",
      ),
    staleTime: 15_000,
  });
}

export interface BookmarksData {
  innovations: Innovation[];
  opportunities: Opportunity[];
}

export function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: () => api.get<BookmarksData>("/me/bookmarks/"),
    staleTime: 10_000,
  });
}

export function useRequests(direction: "incoming" | "outgoing" = "incoming") {
  return useQuery({
    queryKey: queryKeys.requests(direction),
    queryFn: () =>
      api.get<{ count: number; results: CollaborationRequest[] }>("/collaboration-requests/", {
        direction,
        page_size: 50,
      }),
    staleTime: 10_000,
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: queryKeys.applications,
    queryFn: () =>
      api.get<{ count: number; results: OpportunityApplication[] }>("/me/applications/"),
    staleTime: 15_000,
  });
}

export function useModeration() {
  return useQuery({
    queryKey: queryKeys.moderation,
    queryFn: () => api.get<ModerationOverview>("/moderation/overview/"),
    staleTime: 10_000,
  });
}

export function useStaffOpportunities() {
  return useQuery({
    queryKey: queryKeys.opportunities({ page_size: 50, status: "published,draft,closed,archived" }),
    queryFn: ({ signal }) =>
      fetchOpportunitiesPage(
        { page_size: 50, status: "published,draft,closed,archived" },
        1,
        signal,
      ),
    staleTime: 10_000,
  });
}

export function useStaffInstitutions() {
  return useQuery({
    queryKey: queryKeys.institutions({ page_size: 50 }),
    queryFn: ({ signal }) => fetchInstitutionsPage({ page_size: 50 }, 1, signal),
    staleTime: 30_000,
  });
}

export function invalidatePlatform(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["home"] }),
    queryClient.invalidateQueries({ queryKey: ["innovations"] }),
    queryClient.invalidateQueries({ queryKey: ["innovation"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
    queryClient.invalidateQueries({ queryKey: ["opportunities"] }),
    queryClient.invalidateQueries({ queryKey: ["innovators"] }),
    queryClient.invalidateQueries({ queryKey: ["institutions"] }),
    queryClient.invalidateQueries({ queryKey: ["moderation"] }),
  ]);
}

export type QueryOptions<T> = UseQueryOptions<T>;
