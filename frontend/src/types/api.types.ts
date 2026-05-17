export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'AUTHOR' | 'REVIEWER';

export type BlogStatus =
  | 'DRAFT'
  | 'SUBMITTED_FOR_REVIEW'
  | 'REVIEWED'
  | 'REJECTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UNPUBLISHED';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  bio?: string;
  avatarUrl?: string;
  username?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  blogCount?: number;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  coverImage?: string;
  /** Increments when title/summary/content change; used to reset edit form after save. */
  version?: number;
  tags?: Tag[];
  status: BlogStatus;
  author: User;
  publishedAt?: string;
  readingTime?: number;
  viewCount?: number;
  commentCount?: number;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginatedMeta;
}
